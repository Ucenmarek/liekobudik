import { isConfigured, removeSubscription, subId } from "@/lib/server/push";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) return Response.json({ ok: true });
  try {
    const { endpoint } = (await req.json()) as { endpoint?: unknown };
    if (typeof endpoint === "string" && endpoint.length <= 1000) {
      await removeSubscription(subId(endpoint));
    }
  } catch {}
  return Response.json({ ok: true });
}
