import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import webpush, { type PushSubscription } from "web-push";

/**
 * Server pozná len adresu zariadenia pre upozornenia a časy budenia.
 * Názvy liekov ani mená na server neodchádzajú; text upozornenia si
 * zariadenie doplní samo zo svojich údajov.
 */

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const vapid = {
  publicKey: process.env.VAPID_PUBLIC_KEY ?? "",
  privateKey: process.env.VAPID_PRIVATE_KEY ?? "",
  subject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
};

export function isConfigured(): boolean {
  return Boolean(url && token && vapid.publicKey && vapid.privateKey);
}

let client: Redis | null = null;
export function redis(): Redis {
  if (!client) client = new Redis({ url: url!, token: token! });
  return client;
}

export const ALARMS = "alarms";
export const subKey = (id: string) => `sub:${id}`;
export const timesKey = (id: string) => `subalarms:${id}`;
export const member = (id: string, ts: number) => `${id}|${ts}`;
/** Zariadenie, ktoré sa 60 dní neozve, sa zo servera vymaže. */
export const KEEP_SECONDS = 60 * 24 * 3600;

const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /\.push\.apple\.com$/,
  /\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
];

/** Overí tvar odberu a to, že adresa patrí známej službe upozornení. */
export function parseSubscription(input: unknown): PushSubscription | null {
  const s = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 1000) return null;
  if (typeof s.keys?.p256dh !== "string" || typeof s.keys?.auth !== "string") return null;
  if (s.keys.p256dh.length > 200 || s.keys.auth.length > 100) return null;
  try {
    const u = new URL(s.endpoint);
    if (u.protocol !== "https:" || !PUSH_HOSTS.some((re) => re.test(u.hostname))) return null;
  } catch {
    return null;
  }
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

export function subId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

/** Pošle upozornenie. Vráti "gone", ak odber už neplatí. */
export async function send(sub: PushSubscription, payload: object): Promise<"ok" | "gone" | "error"> {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), {
      vapidDetails: vapid,
      TTL: 15 * 60,
      urgency: "high",
    });
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "error";
  }
}

export async function removeSubscription(id: string) {
  const r = redis();
  const old = (await r.get<number[]>(timesKey(id))) ?? [];
  const p = r.pipeline();
  if (old.length) p.zrem(ALARMS, ...old.map((t) => member(id, t)));
  p.del(subKey(id), timesKey(id));
  await p.exec();
}
