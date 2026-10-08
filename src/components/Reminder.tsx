"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { atTime, shortTime, ymd } from "@/lib/dates";
import { db, skipDose, takeDose } from "@/lib/db";
import { snooze, useNow, useSnoozes } from "@/lib/hooks";
import { doseText, dosesForDate, type Dose } from "@/lib/schedule";
import type { Meal } from "@/lib/types";
import { IconAlarm, IconCheck } from "./Icons";
import { Avatar, MedPhoto } from "./ui";

/** Ako dlho po plánovanom čase sa pripomienka ešte sama zobrazí. */
const WINDOW_MS = 60 * 60000;
const MEAL: Record<Meal, string> = { before: "pred jedlom", after: "po jedle", any: "" };
const NOTIFIED_KEY = "lb.notified";

function wasNotified(key: string): boolean {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]");
    if (list.includes(key)) return true;
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...list.slice(-40), key]));
  } catch {}
  return false;
}

async function notify(title: string, body: string, tag: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opts = { body, tag, icon: "/icon-192.png", badge: "/icon-192.png" };
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {}
}

/** Celoobrazovková pripomienka dávky, keď príde jej čas. */
export function Reminder() {
  const path = usePathname();
  const now = useNow(15000);
  const today = ymd(now);
  const snoozes = useSnoozes();
  const data = useLiveQuery(async () => {
    const [members, medicines, intakes] = await Promise.all([
      db.members.toArray(),
      db.medicines.toArray(),
      db.intakes.where("date").equals(today).toArray(),
    ]);
    return { members, medicines, intakes };
  }, [today]);

  let due: Dose | undefined;
  let dueAt = "";
  if (data) {
    const t = now.getTime();
    due = dosesForDate(data.medicines, data.intakes, today).find((d) => {
      if (d.intake) return false;
      // Odložená dávka sa pripomenie znova až po uplynutí odkladu.
      const at = Math.max(atTime(d.date, d.time).getTime(), snoozes[d.key] ?? 0);
      return at <= t && t - at <= WINDOW_MS;
    });
    if (due) dueAt = `${due.key}|${snoozes[due.key] ?? 0}`;
  }

  const member = due ? data?.members.find((m) => m.id === due.med.memberId) : undefined;
  const many = (data?.members.length ?? 0) > 1;

  useEffect(() => {
    if (!due || !dueAt || wasNotified(dueAt)) return;
    const who = many && member ? `${member.name}: ` : "";
    notify(
      `${who}${due.med.name}`,
      `Čas na liek ${shortTime(due.time)} · ${doseText(due.med.dose, due.med.form)}`,
      due.key,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt]);

  if (!due || path === "/uvod") return null;
  const { med } = due;
  const meal = MEAL[med.meal];

  return (
    <div className="reminder" role="alertdialog" aria-modal="true" aria-label="Pripomienka lieku">
      <div className="reminder-in">
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 0.3 }}>Liekobudík</div>

        <div className="grow" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, width: "100%" }}>
          <div style={{ width: 132, height: 132, borderRadius: "50%", background: "#f5b83d", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#fff", color: "#083c8f", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IconAlarm size={52} />
            </div>
          </div>

          <div>
            {many && member && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 14px 0 5px", borderRadius: 18, background: "#fff", color: "#10201f", fontSize: 16, fontWeight: 800, marginBottom: 10 }}>
                <Avatar member={member} size={26} />
                {member.name}
              </div>
            )}
            <div style={{ fontSize: 18, fontWeight: 600 }}>Čas na liek</div>
            <div className="time">{shortTime(due.time)}</div>
          </div>

          <div style={{ width: "100%", background: "#fff", color: "#10201f", borderRadius: 22, padding: 18, textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
            <MedPhoto blob={med.photo} size={88} radius={16} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{med.name}</div>
              {med.purpose && <div className="muted" style={{ fontSize: 16 }}>{med.purpose}</div>}
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4 }}>
                {doseText(med.dose, med.form)}
                {meal && ` · ${meal}`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <button type="button" className="taken" onClick={() => takeDose(med.id, due.date, due.time)}>
            <IconCheck size={24} />
            Liek je užitý
          </button>
          <button type="button" className="later" onClick={() => snooze(due.key, 15)}>
            Pripomenúť o 15 minút
          </button>
          <button type="button" className="skip" onClick={() => skipDose(med.id, due.date, due.time)}>
            Dnes preskočiť
          </button>
        </div>
      </div>
    </div>
  );
}
