import type { PushSubscription } from "web-push";
import { ALARMS, isConfigured, redis, removeSubscription, send, subKey } from "@/lib/server/push";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BATCH = 300;
/** Budenie staršie ako pol hodiny sa už neposiela. */
const STALE_MS = 30 * 60000;

/**
 * Spúšťa sa každú minútu (Vercel Cron alebo externý plánovač).
 * Rozošle upozornenia, ktorých čas už nastal.
 */
async function tick(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isConfigured()) return Response.json({ error: "not configured" }, { status: 503 });
  const key = new URL(req.url).searchParams.get("key");
  if (req.headers.get("authorization") !== `Bearer ${secret}` && key !== secret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const r = redis();
  const now = Date.now();
  const due = await r.zrange<string[]>(ALARMS, 0, now, { byScore: true, offset: 0, count: BATCH });
  if (due.length === 0) return Response.json({ sent: 0 });

  const ids = [...new Set(due.map((m) => m.split("|")[0]))];
  const subs = await r.mget<(PushSubscription | null)[]>(...ids.map(subKey));
  const byId = new Map(ids.map((id, i) => [id, subs[i]]));

  let sent = 0;
  const gone = new Set<string>();
  await Promise.all(
    due.map(async (m) => {
      const [id, tsRaw] = m.split("|");
      const ts = Number(tsRaw);
      const sub = byId.get(id);
      if (!sub || now - ts > STALE_MS) return;
      const result = await send(sub, { t: ts });
      if (result === "ok") sent++;
      if (result === "gone") gone.add(id);
    }),
  );

  await r.zrem(ALARMS, ...due);
  await Promise.all([...gone].map(removeSubscription));
  return Response.json({ sent, due: due.length, removed: gone.size });
}

export const GET = tick;
export const POST = tick;
