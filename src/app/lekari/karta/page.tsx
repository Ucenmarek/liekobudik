"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { BpChart, BpLegend } from "@/components/BpChart";
import { IconBack, IconCamera, IconCheck, IconEdit, IconPhone, IconReport, IconWarn } from "@/components/Icons";
import { MemberFilter } from "@/components/ui";
import { parseYmd, shortTime, ymd } from "@/lib/dates";
import { db } from "@/lib/db";
import { useObjectUrl } from "@/lib/hooks";
import { resizeImage } from "@/lib/image";
import { average, lastDays } from "@/lib/readings";
import { doseText } from "@/lib/schedule";
import type { HealthCard, Medicine } from "@/lib/types";
import { telUrl } from "@/lib/visits";

const BLOOD = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"];
const fmt = (a: { sys: number; dia: number } | null) => (a ? `${a.sys}/${a.dia}` : "–");

function medLine(m: Medicine): string {
  const dose = doseText(m.dose, m.form);
  const times = m.times.map(shortTime).join(", ");
  if (m.frequency === "alternate") return `${dose} každý druhý deň · ${times}`;
  if (m.frequency === "weekdays") return `${dose} vo vybrané dni · ${times}`;
  return `${dose} · ${times}`;
}

function Photo({ blob, label, onPick, editing, onZoom }: { blob?: Blob; label: string; editing: boolean; onPick: (b?: Blob) => void; onZoom: (url: string) => void }) {
  const url = useObjectUrl(blob);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="stack">
      <input ref={ref} type="file" accept="image/*" hidden onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onPick(await resizeImage(file, 1400)); }} />
      <button type="button" className="card-photo" aria-label={url ? `Zväčšiť: ${label}` : `Odfotiť: ${label}`} onClick={() => (url && !editing ? onZoom(url) : ref.current?.click())}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} />
        ) : (
          <>
            <IconCamera size={22} />
            {label}
          </>
        )}
      </button>
      {editing && blob && (
        <button type="button" className="link-btn" style={{ minHeight: 32, fontSize: 13 }} onClick={() => onPick(undefined)}>Odstrániť</button>
      )}
    </div>
  );
}

export default function KartaPage() {
  const router = useRouter();
  const memberId = useSearchParams().get("m") ?? "";
  const today = ymd(new Date());
  const days = lastDays(today, 30);
  const data = useLiveQuery(async () => {
    const [members, card, medicines, readings] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.cards.get(memberId),
      db.medicines.where("memberId").equals(memberId).toArray(),
      db.readings.where("memberId").equals(memberId).toArray(),
    ]);
    return { members, card, medicines, readings };
  }, [memberId]);
  const [draft, setDraft] = useState<HealthCard | null>(null);
  const [allergy, setAllergy] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);

  if (!data) return <div className="screen" />;
  const member = data.members.find((m) => m.id === memberId);
  if (!member) {
    return (
      <main className="screen">
        <Link href="/lekari" className="btn">Späť na Lekárov</Link>
      </main>
    );
  }

  const card: HealthCard = draft ?? data.card ?? { memberId, drugAllergies: [] };
  const editing = draft !== null;
  // Funkčná aktualizácia: fotka sa spracúva dlhšie a nesmie prepísať medzitým napísané polia.
  const set = (patch: Partial<HealthCard>) =>
    setDraft((prev) => ({ ...(prev ?? data.card ?? { memberId, drugAllergies: [] }), ...patch }));
  const regular = data.medicines.filter((m) => m.frequency !== "asneeded").sort((a, b) => a.name.localeCompare(b.name, "sk"));
  const readings = data.readings.filter((r) => r.date >= days[0] && r.date <= today);
  const isEmpty = !data.card;

  function addAllergy() {
    const name = allergy.trim();
    if (!name) return;
    setDraft((prev) => {
      const base = prev ?? card;
      return base.drugAllergies.some((a) => a.toLowerCase() === name.toLowerCase())
        ? base
        : { ...base, drugAllergies: [...base.drugAllergies, name] };
    });
    setAllergy("");
  }

  async function save() {
    if (!draft) return;
    const pending = allergy.trim();
    const clean = (s?: string) => s?.trim() || undefined;
    await db.cards.put({
      ...draft,
      memberId,
      drugAllergies: pending && !draft.drugAllergies.includes(pending) ? [...draft.drugAllergies, pending] : draft.drugAllergies,
      bloodGroup: clean(draft.bloodGroup),
      birthDate: clean(draft.birthDate),
      insurer: clean(draft.insurer),
      height: clean(draft.height),
      weight: clean(draft.weight),
      otherAllergies: clean(draft.otherAllergies),
      conditions: clean(draft.conditions),
      emergencyName: clean(draft.emergencyName),
      emergencyPhone: clean(draft.emergencyPhone),
    });
    setAllergy("");
    setDraft(null);
  }

  const birth = card.birthDate ? (() => { const d = parseYmd(card.birthDate!); return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`; })() : "–";
  const field = (key: "insurer" | "height" | "weight" | "otherAllergies" | "emergencyName" | "emergencyPhone", label: string, placeholder = "", mode?: "numeric" | "tel") => (
    <div className="stack">
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} className="field" type={mode === "tel" ? "tel" : "text"} inputMode={mode} autoComplete="off" placeholder={placeholder} value={card[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} />
    </div>
  );

  return (
    <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
      <div className="row no-print">
        <Link href="/lekari" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small grow" style={{ fontSize: 26 }}>Zdravotná karta</h1>
        {!editing && (
          <button type="button" className="icon-btn" aria-label="Upraviť kartu" onClick={() => setDraft({ ...card })}>
            <IconEdit size={20} />
          </button>
        )}
      </div>

      {!editing && (
        <div className="no-print">
          <MemberFilter members={data.members} value={memberId} onChange={(id) => router.replace(`/lekari/karta?m=${id}`)} all={false} />
        </div>
      )}

      <div style={{ fontSize: 20, fontWeight: 800 }}>{member.name}</div>

      {isEmpty && !editing && (
        <div className="card no-print" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="muted" style={{ fontSize: 15 }}>
            Karta je zatiaľ prázdna. Vyplňte alergie, krvnú skupinu a kontakt v núdzi, aby ste ich mali pri lekárovi poruke.
          </div>
          <button type="button" className="btn" onClick={() => setDraft({ ...card })}>Vyplniť kartu</button>
        </div>
      )}

      {editing ? (
        <>
          <div className="grid2">
            <div className="stack">
              <label className="label" htmlFor="krv">Krvná skupina</label>
              <select id="krv" className="field" value={card.bloodGroup ?? ""} onChange={(e) => set({ bloodGroup: e.target.value })}>
                {BLOOD.map((b) => (
                  <option key={b} value={b}>{b || "Neviem"}</option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label className="label" htmlFor="nar">Dátum narodenia</label>
              <input id="nar" className="field" type="date" max={today} value={card.birthDate ?? ""} onChange={(e) => set({ birthDate: e.target.value })} />
            </div>
          </div>
          {field("insurer", "Poisťovňa")}
          <div className="grid2">
            {field("height", "Výška (cm)", "", "numeric")}
            {field("weight", "Váha (kg)", "", "numeric")}
          </div>

          <div className="stack">
            <label className="label" htmlFor="alergia">Alergie na lieky</label>
            {card.drugAllergies.length > 0 && (
              <div className="pills">
                {card.drugAllergies.map((a) => (
                  <button key={a} type="button" className="tag" aria-label={`Odstrániť alergiu ${a}`} onClick={() => set({ drugAllergies: card.drugAllergies.filter((x) => x !== a) })}>
                    {a} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
            <div className="row">
              <input id="alergia" className="field" type="text" autoComplete="off" placeholder="napr. Penicilín" value={allergy} onChange={(e) => setAllergy(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAllergy(); } }} />
              <button type="button" className="btn soft" onClick={addAllergy}>Pridať</button>
            </div>
          </div>
          {field("otherAllergies", "Iné alergie", "napr. peľ, orechy")}

          <div className="stack">
            <div className="label">Kartička poistenca</div>
            <div className="grid2" style={{ gap: 10 }}>
              <Photo blob={card.cardFront} label="Predná strana" editing onPick={(b) => set({ cardFront: b })} onZoom={setZoom} />
              <Photo blob={card.cardBack} label="Zadná strana" editing onPick={(b) => set({ cardBack: b })} onZoom={setZoom} />
            </div>
          </div>

          <div className="stack">
            <label className="label" htmlFor="ochorenia">Ochorenia a operácie</label>
            <textarea id="ochorenia" className="field" placeholder="napr. vysoký tlak od 2021, operácia slepého čreva" value={card.conditions ?? ""} onChange={(e) => set({ conditions: e.target.value })} />
          </div>

          {field("emergencyName", "Kontakt v núdzi", "meno a vzťah, napr. Jana, dcéra")}
          {field("emergencyPhone", "Telefón na kontakt v núdzi", "", "tel")}

          <div className="grid2" style={{ marginTop: 6 }}>
            <button type="button" className="btn outline" style={{ minHeight: 56 }} onClick={() => { setDraft(null); setAllergy(""); }}>Zrušiť</button>
            <button type="button" className="btn green" style={{ minHeight: 56, fontSize: 17 }} onClick={save}>
              <IconCheck size={20} />
              Uložiť
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "104px minmax(0, 1fr)", gap: 10 }}>
            <div style={{ background: "var(--red-soft)", color: "#7a1a2c", borderRadius: 18, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Krvná skupina</div>
              <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>{card.bloodGroup || "–"}</div>
            </div>
            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
              <div className="kv"><span>Narodenie</span><span>{birth}</span></div>
              <div className="kv"><span>Poisťovňa</span><span>{card.insurer || "–"}</span></div>
              <div className="kv"><span>Výška, váha</span><span>{card.height ? `${card.height} cm` : "–"}, {card.weight ? `${card.weight} kg` : "–"}</span></div>
            </div>
          </div>

          <div className="card" style={{ border: "2px solid #c2304a", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="row" style={{ gap: 8, color: "var(--red)" }}>
              <IconWarn />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#7a1a2c" }}>Alergie na lieky</h2>
            </div>
            {card.drugAllergies.length > 0 ? (
              <div className="pills">
                {card.drugAllergies.map((a) => (
                  <span key={a} className="tag">{a}</span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 15 }}>Žiadne zapísané</div>
            )}
            {card.otherAllergies && <div className="muted" style={{ fontSize: 13 }}>Iné alergie: {card.otherAllergies}</div>}
          </div>

          {(card.cardFront || card.cardBack) && (
            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Kartička poistenca</h2>
              <div className="grid2" style={{ gap: 10 }}>
                {card.cardFront && <Photo blob={card.cardFront} label="Predná strana" editing={false} onPick={() => {}} onZoom={setZoom} />}
                {card.cardBack && <Photo blob={card.cardBack} label="Zadná strana" editing={false} onPick={() => {}} onZoom={setZoom} />}
              </div>
              <div className="muted no-print" style={{ fontSize: 13 }}>Ťuknutím sa fotka zväčší na celú obrazovku.</div>
            </div>
          )}

          <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="between" style={{ alignItems: "baseline" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Lieky, ktoré pravidelne užívam</h2>
              <span className="muted no-print" style={{ fontSize: 13 }}>z Liekov</span>
            </div>
            {regular.length === 0 && <div className="muted" style={{ fontSize: 15 }}>Žiadne pravidelné lieky</div>}
            {regular.map((m) => (
              <div key={m.id} className="line" style={{ minHeight: 52 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{m.name}</div>
                  {m.purpose && <div className="muted" style={{ fontSize: 13 }}>{m.purpose}</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{medLine(m)}</div>
              </div>
            ))}
          </div>

          {readings.length > 0 && (
            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="between" style={{ alignItems: "baseline" }}>
                <h2 style={{ fontSize: 16, fontWeight: 800 }}>Tlak za 30 dní</h2>
                <BpLegend />
              </div>
              <BpChart days={days} readings={readings} />
              <div className="grid2" style={{ gap: 10 }}>
                <div className="avg morning" style={{ padding: "8px 12px", borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Priemer ráno</div>
                  <div className="v" style={{ fontSize: 20 }}>{fmt(average(readings.filter((r) => r.part === "morning")))}</div>
                </div>
                <div className="avg evening" style={{ padding: "8px 12px", borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Priemer večer</div>
                  <div className="v" style={{ fontSize: 20 }}>{fmt(average(readings.filter((r) => r.part === "evening")))}</div>
                </div>
              </div>
            </div>
          )}

          {card.conditions && (
            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800 }}>Ochorenia a operácie</h2>
              <div style={{ fontSize: 15, whiteSpace: "pre-wrap" }}>{card.conditions}</div>
            </div>
          )}

          {(card.emergencyName || card.emergencyPhone) && (
            <div className="card row" style={{ padding: 14 }}>
              <div className="grow">
                <h2 style={{ fontSize: 16, fontWeight: 800 }}>Kontakt v núdzi</h2>
                <div style={{ fontSize: 15, marginTop: 2 }}>{[card.emergencyName, card.emergencyPhone].filter(Boolean).join(" · ")}</div>
              </div>
              {card.emergencyPhone && (
                <a href={telUrl(card.emergencyPhone)} aria-label="Zavolať kontaktu v núdzi" className="no-print" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--blue-soft)", color: "var(--blue-dark)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <IconPhone size={20} />
                </a>
              )}
            </div>
          )}

          <button type="button" className="btn big no-print" onClick={() => window.print()}>
            <IconReport size={22} />
            Vytlačiť pre lekára
          </button>
        </>
      )}

      {zoom && (
        <button type="button" className="zoom" aria-label="Zavrieť fotku" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Kartička poistenca" />
        </button>
      )}
    </main>
  );
}
