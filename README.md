# Liekobudík

**Lieky v správny čas.** Pripomienkovač liekov pre celú rodinu: čo užiť, kedy, a kedy sa zásoba míňa.

Bez registrácie. Všetky údaje ostávajú len v zariadení (IndexedDB), nič sa neposiela na server.

## Čo je hotové (etapy 1 až 3: Lieky, Dnes, Merania, Budík)

- Úvod a členovia rodiny (meno, farba, poznámka)
- Nový liek: fotka krabičky, názov, na čo je, forma, kusov v balení, zásoba doma
- Užívanie: dávka, každý deň / vybrané dni / každý druhý deň / podľa potreby, časy, jedlo, dátum ukončenia
- Dnes: ďalšia dávka, potvrdenie užitia, odloženie o 15 minút, upozornenie na dochádzajúcu zásobu
- Lieky: zásoba a na koľko dní vystačí, „Kúpil som nové balenie“, „Užiť teraz“
- Celoobrazovková pripomienka, keď príde čas dávky a appka je otvorená
- Merania: zápis tlaku ráno a večer, priemery a graf za 7 dní, prehľad pre lekára na vytlačenie (bez vyhodnocovania hodnôt)
- Budík zo servera (web push): upozornenie príde, aj keď je appka zavretá
- Záloha do súboru a obnovenie zo zálohy
- PWA: dá sa pridať na plochu telefónu a otvorí sa aj bez internetu

## Čo príde

- Pripomienka merania tlaku a e-mail
- Lekári: návštevy, preventívne prehliadky, kontakty, zdravotná karta
- Fotka alebo avatar člena rodiny

## Spustenie

```bash
npm install
npm run dev
```

Appka beží na http://localhost:3000.

## Nasadenie

Projekt je bežný Next.js, na Vercel stačí pripojiť GitHub repozitár, bez ďalších nastavení.

## Budík zo servera

Bez nastavenia appka funguje, len pripomína iba vtedy, keď je otvorená.

Na server ide len adresa zariadenia pre upozornenia a časy budenia. Názvy liekov a mená ostávajú v zariadení; text upozornenia si service worker doplní z miestnych údajov.

Nastavenie na Verceli:

1. **Storage → Upstash → Redis**, pripojiť k projektu. Vercel doplní `KV_REST_API_URL` a `KV_REST_API_TOKEN`.
2. Vygenerovať kľúče `npx web-push generate-vapid-keys` a v **Settings → Environment Variables** pridať `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (napr. `mailto:meno@domena.sk`) a `CRON_SECRET` (dlhé náhodné heslo).
3. Redeploy.
4. Každú minútu volať `https://DOMENA/api/push/tick` s hlavičkou `Authorization: Bearer CRON_SECRET`:
   - plán Hobby (free): Cloudflare Worker z priečinka `cloudflare/`, pozri nižšie (Vercel Cron tu beží len raz denne)
   - plán Pro: stačí Vercel Cron (`vercel.json`, výraz `* * * * *`), hlavičku pridá Vercel sám

### Minútový spúšťač na Cloudflare

V `cloudflare/wrangler.toml` doplňte do `TICK_URL` adresu appky a potom:

```bash
cd cloudflare
npx wrangler login
npx wrangler deploy
npx wrangler secret put CRON_SECRET   # tá istá hodnota ako na Verceli
```

Priebeh uvidíte cez `npx wrangler tail` alebo v Cloudflare pri Workeri v záložke Logs: `tick 200 {"sent":0}` znamená, že všetko beží a práve nie je čo poslať.

Zariadenie posiela budenia na 30 dní dopredu a pri každom otvorení appky ich obnoví.

## Štruktúra

- `src/app` – obrazovky (Dnes, Lieky, liek, členovia, nastavenia, úvod)
- `src/components` – spoločné časti (navigácia, pripomienka, ikony)
- `src/lib` – databáza v zariadení, rozvrh dávok, dátumy
- `src/app/api/push` – server budíka (prihlásenie zariadenia, časy, rozosielanie)
- `cloudflare/` – Worker, ktorý každú minútu spustí rozosielanie
- `public/sw.js` – service worker (offline, zobrazenie upozornenia)
