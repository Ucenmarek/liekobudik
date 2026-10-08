import { isConfigured, parseSubscription, send } from "@/lib/server/push";

export const dynamic = "force-dynamic";

/** Skúšobné upozornenie na zariadenie, ktoré oň požiadalo. */
export async function POST(req: Request) {
  if (!isConfigured()) return Response.json({ error: "not configured" }, { status: 503 });
  let sub = null;
  try {
    sub = parseSubscription(((await req.json()) as { subscription?: unknown }).subscription);
  } catch {}
  if (!sub) return Response.json({ error: "bad request" }, { status: 400 });
  const result = await send(sub, { test: true });
  return Response.json({ ok: result === "ok", result }, { status: result === "ok" ? 200 : 502 });
}
