/* Liekobudík – service worker: appka sa otvorí aj bez internetu. */
const CACHE = "liekobudik-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Nemenné súbory: najprv z pamäte.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|woff2)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Stránky: najprv zo siete, bez internetu z pamäte.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
        if (hit) return hit;
        throw err;
      }
    })(),
  );
});

/* ---------- Budík zo servera ---------- */

// Otvorí databázu appky v zariadení. Ak ešte neexistuje, nevytvára ju.
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("liekobudik");
    req.onupgradeneeded = () => req.transaction.abort();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve) => {
    try {
      const req = db.transaction(store).objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch (err) {
      resolve(undefined);
    }
  });
}

// Server pošle len čas budenia. Názov lieku a meno si doplníme z údajov v zariadení.
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch (err) {}
      const base = { icon: "/icon-192.png", lang: "sk", data: { url: "/" } };

      if (data.test) {
        await self.registration.showNotification("Liekobudík", {
          ...base,
          body: "Skúšobné upozornenie funguje.",
          tag: "test",
        });
        return;
      }

      let items = null;
      try {
        const db = await openDb();
        const alarm = await idbGet(db, "alarms", data.t);
        if (alarm && Array.isArray(alarm.items)) {
          items = [];
          for (const item of alarm.items) {
            // Dávka, ktorá je už užitá alebo preskočená, sa nepripomína.
            if (!(await idbGet(db, "intakes", item.key))) items.push(item);
          }
        }
        db.close();
      } catch (err) {}

      if (items === null) {
        await self.registration.showNotification("Liekobudík", {
          ...base,
          body: "Čas na liek. Otvorte appku a pozrite dnešné lieky.",
          tag: "liekobudik",
        });
        return;
      }

      await Promise.all(
        items.map((item) =>
          self.registration.showNotification(item.title, {
            ...base,
            body: item.body,
            tag: item.key,
            renotify: true,
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 400],
          }),
        ),
      );
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
