# Liekobudík

**Lieky v správny čas.** Pripomienkovač liekov pre celú rodinu: čo užiť, kedy, a kedy sa zásoba míňa.

Bez registrácie. Všetky údaje ostávajú len v zariadení (IndexedDB), nič sa neposiela na server.

## Čo je hotové (etapa 1: Lieky + Dnes)

- Úvod a členovia rodiny (meno, farba, poznámka)
- Nový liek: fotka krabičky, názov, na čo je, forma, kusov v balení, zásoba doma
- Užívanie: dávka, každý deň / vybrané dni / každý druhý deň / podľa potreby, časy, jedlo, dátum ukončenia
- Dnes: ďalšia dávka, potvrdenie užitia, odloženie o 15 minút, upozornenie na dochádzajúcu zásobu
- Lieky: zásoba a na koľko dní vystačí, „Kúpil som nové balenie“, „Užiť teraz“
- Celoobrazovková pripomienka, keď príde čas dávky a appka je otvorená
- Záloha do súboru a obnovenie zo zálohy
- PWA: dá sa pridať na plochu telefónu a otvorí sa aj bez internetu

## Čo príde

- Budík zo servera (push), ktorý zazvoní aj pri zavretej appke, a e-mail
- Merania: tlak ráno a večer
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

## Štruktúra

- `src/app` – obrazovky (Dnes, Lieky, liek, členovia, nastavenia, úvod)
- `src/components` – spoločné časti (navigácia, pripomienka, ikony)
- `src/lib` – databáza v zariadení, rozvrh dávok, dátumy
- `public/sw.js` – service worker
