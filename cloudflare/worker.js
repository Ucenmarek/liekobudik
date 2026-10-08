/**
 * Liekobudík – minútový spúšťač budíka.
 *
 * Appka beží na Verceli, kde free plán nedovolí spúšťať úlohu každú minútu.
 * Tento Worker preto každú minútu zavolá /api/push/tick, ktorý rozošle
 * upozornenia, ktorých čas nastal. Žiadne údaje tu neostávajú.
 */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env));
  },

  // Otvorenie adresy Workera v prehliadači nič nespúšťa.
  async fetch() {
    return new Response("Liekobudík tick beží podľa plánu.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};

async function tick(env) {
  if (!env.TICK_URL || !env.CRON_SECRET) {
    console.error("Chýba TICK_URL alebo CRON_SECRET.");
    return;
  }
  try {
    const res = await fetch(env.TICK_URL, {
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    const text = await res.text();
    if (res.ok) console.log(`tick ${res.status} ${text}`);
    else console.error(`tick ${res.status} ${text}`);
  } catch (err) {
    console.error(`tick zlyhal: ${err}`);
  }
}
