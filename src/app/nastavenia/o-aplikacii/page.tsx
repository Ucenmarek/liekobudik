import Link from "next/link";
import type { ReactNode } from "react";
import { AppIcon, IconBack, IconLock } from "@/components/Icons";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h2>
      {children}
    </section>
  );
}

const P = ({ children }: { children: ReactNode }) => (
  <p style={{ fontSize: 15, lineHeight: 1.45 }}>{children}</p>
);

const STEPS: [string, string][] = [
  ["Pridajte členov rodiny", "V Nastaveniach pod Členovia rodiny pridajte seba aj blízkych, o ktorých lieky sa staráte. Každý má svoju farbu."],
  ["Pridajte lieky", "V záložke Lieky ťuknite na Pridať liek. Odfoťte krabičku, napíšte názov, na čo liek je a koľko kusov máte doma. Potom vyberte, kedy sa užíva."],
  ["Zapnite budík", "V Nastaveniach pod Budík ťuknite na Zapnúť a povoľte upozornenia. Pripomienka potom príde, aj keď je appka zavretá. Na iPhone treba appku najprv pridať na plochu."],
  ["Potvrdzujte užitie", "Keď príde čas, ťuknite na Liek je užitý. Appka odpočíta kusy zo zásoby. Dávku môžete odložiť o 15 minút alebo dnes preskočiť."],
  ["Sledujte zásoby", "Keď liek dochádza, appka na to upozorní na obrazovke Dnes aj v Liekoch. Po kúpe ťuknite na Kúpil som nové balenie."],
  ["Zapisujte tlak", "V záložke Merania si zapíšte tlak ráno a večer. Prehľad pre lekára sa dá vytlačiť alebo uložiť ako PDF."],
  ["Zapíšte návštevy a prehliadky", "V záložke Lekári pridajte termín u lekára, preventívne prehliadky a kontakty na ambulancie."],
  ["Vyplňte zdravotnú kartu", "V záložke Karta majte poruke alergie na lieky, krvnú skupinu, kartičku poistenca a kontakt v núdzi."],
];

export default function OAplikaciiPage() {
  return (
    <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
      <div className="row">
        <Link href="/nastavenia" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small">O aplikácii</h1>
      </div>

      <div className="row" style={{ gap: 14, padding: "4px 2px" }}>
        <AppIcon size={64} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1 }}>
            <span style={{ color: "#0a57c9" }}>lieko</span>
            <span style={{ color: "#2a8f3a" }}>budík</span>
          </div>
          <div className="muted" style={{ fontSize: 15 }}>Lieky v správny čas.</div>
        </div>
      </div>

      <div className="note green" style={{ borderRadius: 18, alignItems: "flex-start" }}>
        <IconLock size={26} />
        <div style={{ fontSize: 15, lineHeight: 1.45 }}>
          <strong>Vaše údaje sú len v tomto telefóne.</strong> Liekobudík nemá registráciu ani účet a vaše lieky, merania, návštevy ani zdravotnú kartu nikam neposiela.
        </div>
      </div>

      <Section title="Kde sú moje údaje">
        <P>Všetko, čo do appky zapíšete, vrátane fotiek, sa ukladá priamo v prehliadači tohto zariadenia. Nikto iný k tomu nemá prístup, ani prevádzkovateľ appky.</P>
        <P>
          <strong>Čo odchádza na server:</strong> len ak zapnete budík, a to dve veci: adresa tohto zariadenia pre upozornenia a časy, kedy má zazvoniť. Názvy liekov, mená ani dôvody návštev na server nejdú. Text upozornenia si telefón doplní sám zo svojich údajov.
        </P>
        <P>
          <strong>Tlačidlá Mapa a Zavolať</strong> otvoria mapu alebo telefón. Vtedy sa adresa alebo číslo odovzdá tej aplikácii, rovnako ako keby ste ich zadali ručne.
        </P>
      </Section>

      <Section title="Zálohujte si údaje">
        <P>Keďže údaje nie sú nikde inde, pri strate telefónu, odinštalovaní appky alebo vymazaní údajov prehliadača sa stratia.</P>
        <P>
          V <Link href="/nastavenia">Nastaveniach</Link> pod Záloha ťuknite na Stiahnuť zálohu a súbor si odložte. V novom telefóne ho načítate cez Obnoviť zo zálohy. Súbor obsahuje vaše zdravotné údaje, tak ho neposielajte ďalej.
        </P>
      </Section>

      <Section title="Ako Liekobudík používať">
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
          {STEPS.map(([title, text], i) => (
            <li key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span className="avatar" style={{ width: 28, height: 28, fontSize: 14, background: "var(--blue)" }} aria-hidden="true">{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
                <div className="muted" style={{ fontSize: 14, lineHeight: 1.4 }}>{text}</div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Čo treba vedieť o budíku">
        <P>Upozornenie príde v danej minúte, najviac s malým oneskorením. Je to bežné upozornenie telefónu so zvukom a vibráciou, nie budík, ktorý zvoní, kým ho nevypnete.</P>
        <P>Ak má telefón vypnutý zvuk, režim Nerušiť alebo je bez internetu, upozornenie nemusí byť počuť alebo príde neskôr. Pri liekoch, kde na čase veľmi záleží, sa nespoliehajte len na appku.</P>
        <P>Telefón si budenia pripravuje na 30 dní dopredu. Stačí appku raz za čas otvoriť a obnovia sa samy.</P>
      </Section>

      <Section title="Dôležité upozornenie">
        <P>Liekobudík je pomôcka na pripomínanie a zapisovanie. Nenahrádza pokyny vášho lekára ani lekárnika. Hodnoty tlaku appka nevyhodnocuje, len ich zapisuje.</P>
        <P>Dávkovanie a užívanie liekov si vždy nastavte podľa toho, čo vám predpísal lekár.</P>
      </Section>
    </main>
  );
}
