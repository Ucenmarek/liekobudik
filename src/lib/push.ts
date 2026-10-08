import { atTime, shortTime, ymd } from "./dates";
import { db } from "./db";
import { readSnoozes } from "./hooks";
import { doseText, dosesForDate } from "./schedule";
import type { Alarm, Meal } from "./types";
import { checkupDue, visitReminderTimes, visitTitle } from "./visits";

/**
 * Budík zo servera (web push). Na server ide len adresa zariadenia a časy
 * budenia. Text upozornenia ostáva v zariadení v tabuľke "alarms" a
 * service worker si ho pri budení prečíta sám.
 */

const HORIZON_DAYS = 30;
const MAX_TIMES = 800;
const MEAL: Record<Meal, string> = { before: "pred jedlom", after: "po jedle", any: "" };

export type PushResult = "ok" | "denied" | "unsupported" | "unconfigured" | "error";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iPhone a iPad povolia upozornenia len appke pridanej na plochu. */
export function needsHomeScreen(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

export async function serverInfo(): Promise<{ enabled: boolean; publicKey?: string }> {
  try {
    const r = await fetch("/api/push", { cache: "no-store" });
    return r.ok ? await r.json() : { enabled: false };
  } catch {
    return { enabled: false };
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? await reg.pushManager.getSubscription() : null;
  } catch {
    return null;
  }
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const bin = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function ready(timeoutMs = 5000): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("sw timeout")), timeoutMs)),
  ]);
}

export async function enablePush(): Promise<PushResult> {
  if (!pushSupported()) return "unsupported";
  const info = await serverInfo();
  if (!info.enabled || !info.publicKey) return "unconfigured";
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return "error";
  }
  if (permission !== "granted") return "denied";
  try {
    const reg = await ready();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(info.publicKey),
      }));
    return (await syncAlarms(sub)) ? "ok" : "error";
  } catch {
    return "error";
  }
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (sub) {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  await db.alarms.clear();
}

export async function sendTest(): Promise<boolean> {
  const sub = await currentSubscription();
  if (!sub) return false;
  try {
    const r = await fetch("/api/push/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Budenia na najbližších 30 dní: neužité dávky a odložené pripomienky. */
export async function buildAlarms(now = new Date()): Promise<Alarm[]> {
  const today = ymd(now);
  const [members, medicines, intakes, doctors, visits, checkups] = await Promise.all([
    db.members.toArray(),
    db.medicines.toArray(),
    db.intakes.where("date").aboveOrEqual(today).toArray(),
    db.doctors.toArray(),
    db.visits.where("date").aboveOrEqual(today).toArray(),
    db.checkups.toArray(),
  ]);
  const snoozes = readSnoozes();
  const many = members.length > 1;
  const byTime = new Map<number, Alarm["items"]>();

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const date = ymd(day);
    for (const dose of dosesForDate(medicines, intakes, date)) {
      if (dose.intake) continue;
      let at = atTime(date, dose.time).getTime();
      const snoozed = snoozes[dose.key];
      if (snoozed && snoozed > at) at = snoozed;
      at = Math.ceil(at / 60000) * 60000;
      if (at <= now.getTime()) continue;
      const who = members.find((m) => m.id === dose.med.memberId);
      const meal = MEAL[dose.med.meal];
      const item = {
        key: dose.key,
        title: many && who ? `${who.name}: ${dose.med.name}` : dose.med.name,
        body: `Čas na liek ${shortTime(dose.time)} · ${doseText(dose.med.dose, dose.med.form)}${meal ? ` · ${meal}` : ""}`,
      };
      byTime.set(at, [...(byTime.get(at) ?? []), item]);
    }
  }

  const horizon = now.getTime() + HORIZON_DAYS * 86400000;
  const add = (at: number, item: Alarm["items"][number]) => {
    const ts = Math.ceil(at / 60000) * 60000;
    if (ts <= now.getTime() || ts > horizon) return;
    byTime.set(ts, [...(byTime.get(ts) ?? []), item]);
  };
  const prefix = (memberId: string) => {
    const who = members.find((m) => m.id === memberId);
    return many && who ? `${who.name}: ` : "";
  };

  // Návštevy lekára
  const WHEN = { dayBefore: "Zajtra", morning: "Dnes", hourBefore: "O hodinu" };
  for (const v of visits) {
    for (const r of visitReminderTimes(v)) {
      add(r.at, {
        key: `visit|${v.id}|${r.kind}`,
        title: `${prefix(v.memberId)}${visitTitle(v, doctors)}`,
        body: `${WHEN[r.kind]} o ${shortTime(v.time)}${v.reason ? ` · ${v.reason}` : ""}${v.bring.length ? ` · vziať: ${v.bring.join(", ").toLowerCase()}` : ""}`,
      });
    }
  }

  // Preventívne prehliadky: dva týždne pred termínom o 9:00
  for (const c of checkups) {
    const due = checkupDue(c);
    if (!due) continue;
    const d = atTime(due, "09:00");
    d.setDate(d.getDate() - 14);
    add(d.getTime(), {
      key: `checkup|${c.id}|${due}`,
      title: `${prefix(c.memberId)}${c.name}`,
      body: "Preventívna prehliadka vychádza o dva týždne. Objednajte sa.",
    });
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_TIMES)
    .map(([ts, items]) => ({ ts, items }));
}

/** Uloží budenia do zariadenia a ich časy pošle na server. */
export async function syncAlarms(given?: PushSubscription): Promise<boolean> {
  const sub = given ?? (await currentSubscription());
  if (!sub) return false;
  const alarms = await buildAlarms();
  await db.transaction("rw", db.alarms, async () => {
    await db.alarms.clear();
    await db.alarms.bulkPut(alarms);
  });
  try {
    const r = await fetch("/api/push/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), times: alarms.map((a) => a.ts) }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
