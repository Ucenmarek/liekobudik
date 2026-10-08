import {
  ALARMS,
  KEEP_SECONDS,
  isConfigured,
  member,
  parseSubscription,
  redis,
  subId,
  subKey,
  timesKey,
} from "@/lib/server/push";

export const dynamic = "force-dynamic";

const MAX_TIMES = 800;
const HORIZON_MS = 32 * 24 * 3600 * 1000;

/** Zariadenie pošle časy najbližších budení; nahradia tie predošlé. */
export async function POST(req: Request) {
  if (!isConfigured()) return Response.json({ error: "not configured" }, { status: 503 });
  let body: { subscription?: unknown; times?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  const sub = parseSubscription(body.subscription);
  if (!sub || !Array.isArray(body.times)) return Response.json({ error: "bad request" }, { status: 400 });

  const now = Date.now();
  const times = [
    ...new Set(
      body.times
        .filter((t): t is number => Number.isInteger(t) && t > now - 60000 && t < now + HORIZON_MS)
        .map((t) => Math.ceil(t / 60000) * 60000),
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, MAX_TIMES);

  const id = subId(sub.endpoint);
  const r = redis();
  const old = (await r.get<number[]>(timesKey(id))) ?? [];
  const p = r.pipeline();
  if (old.length) p.zrem(ALARMS, ...old.map((t) => member(id, t)));
  p.set(subKey(id), sub, { ex: KEEP_SECONDS });
  p.set(timesKey(id), times, { ex: KEEP_SECONDS });
  if (times.length) {
    const [first, ...rest] = times.map((t) => ({ score: t, member: member(id, t) }));
    p.zadd(ALARMS, first, ...rest);
  }
  await p.exec();
  return Response.json({ ok: true, count: times.length });
}
