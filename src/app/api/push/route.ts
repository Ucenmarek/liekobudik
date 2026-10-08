import { isConfigured, vapid } from "@/lib/server/push";

export const dynamic = "force-dynamic";

/** Či je budík na serveri nastavený, a verejný kľúč pre prihlásenie zariadenia. */
export function GET() {
  return Response.json(
    isConfigured() ? { enabled: true, publicKey: vapid.publicKey } : { enabled: false },
    { headers: { "cache-control": "no-store" } },
  );
}
