"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DayPartIcon, IconBack, IconCamera, IconCheck, IconZoom } from "@/components/Icons";
import { Avatar, MedPhoto, PhotoViewer, ZoomPhoto } from "@/components/ui";
import { ymd } from "@/lib/dates";
import { db, deleteMedicine, uid } from "@/lib/db";
import { useMemberFilter } from "@/lib/hooks";
import { resizeImage } from "@/lib/image";
import { FORMS, doseText, num, type DayPart } from "@/lib/schedule";
import type { Form, Frequency, Meal, Medicine } from "@/lib/types";

const PRESETS: { time: string; label: string; part: DayPart }[] = [
  { time: "07:00", label: "Ráno", part: "morning" },
  { time: "13:00", label: "Obed", part: "noon" },
  { time: "19:00", label: "Večer", part: "evening" },
];
const PRESET_TIMES = PRESETS.map((p) => p.time);
const WEEKDAYS: [number, string][] = [[1, "Po"], [2, "Ut"], [3, "St"], [4, "Št"], [5, "Pi"], [6, "So"], [0, "Ne"]];
const FREQ: [Frequency, string][] = [
  ["daily", "Každý deň"],
  ["weekdays", "Vybrané dni"],
  ["alternate", "Každý druhý deň"],
  ["asneeded", "Podľa potreby"],
];
const MEALS: [Meal, string][] = [["before", "Pred jedlom"], ["after", "Po jedle"], ["any", "Je to jedno"]];
const WARN = [3, 5, 7, 10, 14];

interface Draft {
  memberId: string;
  name: string;
  purpose: string;
  photo?: Blob;
  form: Form;
  packSize: string;
  stock: string;
  warnDays: number;
  dose: number;
  frequency: Frequency;
  weekdays: number[];
  times: string[];
  meal: Meal;
  endDate: string;
  original?: Medicine;
}

function blank(memberId: string): Draft {
  return {
    memberId,
    name: "",
    purpose: "",
    form: "tableta",
    packSize: "30",
    stock: "",
    warnDays: 7,
    dose: 1,
    frequency: "daily",
    weekdays: [1, 2, 3, 4, 5],
    times: ["07:00"],
    meal: "any",
    endDate: "",
  };
}

function fromMedicine(m: Medicine): Draft {
  return {
    memberId: m.memberId,
    name: m.name,
    purpose: m.purpose,
    photo: m.photo,
    form: m.form,
    packSize: String(m.packSize),
    stock: String(m.stock),
    warnDays: m.warnDays,
    dose: m.dose,
    frequency: m.frequency,
    weekdays: m.weekdays,
    times: m.times,
    meal: m.meal,
    endDate: m.endDate ?? "",
    original: m,
  };
}

const toNumber = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function LiekPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const onboarding = params.get("onboarding") === "1";
  const members = useLiveQuery(() => db.members.orderBy("order").toArray(), []);
  const [filter] = useMemberFilter();
  const [step, setStep] = useState<1 | 2>(1);
  const [f, setF] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (f || !members) return;
    if (members.length === 0) {
      router.replace("/uvod");
      return;
    }
    if (id) {
      db.medicines.get(id).then((m) => {
        if (m) setF(fromMedicine(m));
        else router.replace("/lieky");
      });
    } else {
      setF(blank(members.find((m) => m.id === filter)?.id ?? members[0].id));
    }
  }, [f, members, id, filter, router]);

  if (!f || !members) return <div className="screen" />;

  const set = (patch: Partial<Draft>) => {
    setError("");
    setF((prev) => (prev ? { ...prev, ...patch } : prev));
  };
  const member = members.find((m) => m.id === f.memberId);
  const stepLabel = onboarding ? `Krok ${step + 1} z 3` : `Krok ${step} z 2`;
  const customTimes = f.times.filter((t) => !PRESET_TIMES.includes(t));
  const asNeeded = f.frequency === "asneeded";

  async function pickPhoto(file?: File) {
    if (!file) return;
    try {
      set({ photo: await resizeImage(file) });
    } catch {
      setError("Fotku sa nepodarilo načítať.");
    }
  }

  function toStep2() {
    if (!f) return;
    if (!f.name.trim()) {
      setError("Napíšte názov lieku.");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  }

  function toggleTime(time: string) {
    if (!f) return;
    set({ times: f.times.includes(time) ? f.times.filter((t) => t !== time) : [...f.times, time] });
  }

  function addCustomTime() {
    if (!f) return;
    const candidates = ["12:00", "06:00", "10:00", "16:00", "18:00", "22:00"];
    const time = candidates.find((t) => !f.times.includes(t)) ?? "12:30";
    set({ times: [...f.times, time] });
  }

  function changeCustomTime(old: string, value: string) {
    if (!f || !value) return;
    if (f.times.includes(value)) {
      set({ times: f.times.filter((t) => t !== old) });
      return;
    }
    set({ times: f.times.map((t) => (t === old ? value : t)) });
  }

  async function save() {
    if (!f || saving) return;
    if (!asNeeded && f.times.length === 0) {
      setError("Vyberte aspoň jeden čas.");
      return;
    }
    if (f.frequency === "weekdays" && f.weekdays.length === 0) {
      setError("Vyberte aspoň jeden deň.");
      return;
    }
    setSaving(true);
    const packSize = toNumber(f.packSize);
    const med: Medicine = {
      id: f.original?.id ?? uid(),
      memberId: f.memberId,
      name: f.name.trim(),
      purpose: f.purpose.trim(),
      photo: f.photo,
      form: f.form,
      packSize,
      stock: f.stock.trim() === "" ? packSize : toNumber(f.stock),
      warnDays: f.warnDays,
      dose: f.dose,
      frequency: f.frequency,
      weekdays: f.weekdays,
      times: asNeeded ? [] : [...f.times].sort(),
      meal: f.meal,
      startDate: f.original?.startDate ?? ymd(new Date()),
      endDate: f.endDate || undefined,
      createdAt: f.original?.createdAt ?? Date.now(),
    };
    await db.medicines.put(med);
    router.replace(onboarding ? "/" : "/lieky");
  }

  async function remove() {
    if (!f?.original) return;
    await deleteMedicine(f.original.id);
    router.replace("/lieky");
  }

  if (step === 1) {
    return (
      <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
        <div className="row">
          <Link href={onboarding ? "/clenovia?onboarding=1" : "/lieky"} className="icon-btn" aria-label="Späť">
            <IconBack />
          </Link>
          <h1 className="h1 small grow">{f.original ? "Upraviť liek" : "Nový liek"}</h1>
          <div className="label">{stepLabel}</div>
        </div>

        {members.length > 1 && (
          <div className="stack">
            <div className="label">Pre koho</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="chip"
                  aria-pressed={f.memberId === m.id}
                  style={{ ["--chip" as string]: m.color }}
                  onClick={() => set({ memberId: m.id })}
                >
                  <Avatar member={m} size={26} />
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="stack">
          <div className="label">Fotka krabičky, aby sa liek nedal pomýliť</div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className={`photo-btn${f.photo ? " has" : ""}`} onClick={() => fileRef.current?.click()}>
            {f.photo ? (
              <>
                <MedPhoto blob={f.photo} size={76} radius={12} />
                <span>Odfotiť znova</span>
              </>
            ) : (
              <>
                <IconCamera size={32} />
                <span>Odfotiť krabičku</span>
              </>
            )}
          </button>
          {f.photo && (
            <div className="between">
              <button type="button" className="btn soft" style={{ minHeight: 44 }} onClick={() => setPreview(true)}>
                <IconZoom size={18} />
                Náhľad fotky
              </button>
              <button type="button" className="link-btn" onClick={() => set({ photo: undefined })}>
                Odstrániť fotku
              </button>
            </div>
          )}
          {preview && <PhotoViewer blob={f.photo} label={f.name || "Fotka krabičky"} onClose={() => setPreview(false)} />}
        </div>

        <div className="stack">
          <label className="label" htmlFor="nazov">Názov lieku</label>
          <input id="nazov" className="field" type="text" autoComplete="off" value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div className="stack">
          <label className="label" htmlFor="nacoje">Na čo je</label>
          <input id="nacoje" className="field" type="text" autoComplete="off" placeholder="napr. na vysoký tlak" value={f.purpose} onChange={(e) => set({ purpose: e.target.value })} />
        </div>

        <div className="grid2">
          <div className="stack">
            <label className="label" htmlFor="forma">Forma</label>
            <select id="forma" className="field" value={f.form} onChange={(e) => set({ form: e.target.value as Form })}>
              {(Object.keys(FORMS) as Form[]).map((k) => (
                <option key={k} value={k}>{FORMS[k].label}</option>
              ))}
            </select>
          </div>
          <div className="stack">
            <label className="label" htmlFor="balenie">{f.form === "ml" ? "Mililitrov v balení" : "Kusov v balení"}</label>
            <input id="balenie" className="field" type="text" inputMode="decimal" value={f.packSize} onChange={(e) => set({ packSize: e.target.value })} />
          </div>
        </div>

        <div className="grid2">
          <div className="stack">
            <label className="label" htmlFor="zasoba">Mám doma ({FORMS[f.form].unit})</label>
            <input id="zasoba" className="field" type="text" inputMode="decimal" placeholder={f.packSize} value={f.stock} onChange={(e) => set({ stock: e.target.value })} />
          </div>
          <div className="stack">
            <label className="label" htmlFor="vopred">Upozorniť vopred</label>
            <select id="vopred" className="field" value={f.warnDays} onChange={(e) => set({ warnDays: Number(e.target.value) })}>
              {WARN.map((d) => (
                <option key={d} value={d}>{d === 3 ? "3 dni" : `${d} dní`}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="error" role="alert">{error}</div>}
        <div className="grow" />

        <button type="button" className="btn big" onClick={toStep2}>Pokračovať</button>

        {f.original &&
          (confirmDelete ? (
            <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <div>Odstrániť {f.original.name} aj s históriou užívania? Nedá sa to vrátiť.</div>
              <div className="grid2">
                <button type="button" className="btn outline" onClick={() => setConfirmDelete(false)}>Ponechať</button>
                <button type="button" className="btn danger" onClick={remove}>Odstrániť</button>
              </div>
            </div>
          ) : (
            <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
              Odstrániť liek
            </button>
          ))}
      </main>
    );
  }

  return (
    <main className="screen" style={{ paddingTop: 22 }}>
      <div className="row">
        <button type="button" className="icon-btn" aria-label="Späť" onClick={() => setStep(1)}>
          <IconBack />
        </button>
        <h1 className="h1 small grow">Užívanie</h1>
        <div className="label">{stepLabel}</div>
      </div>

      <div className="card row" style={{ padding: "10px 14px 10px 10px" }}>
        <ZoomPhoto blob={f.photo} size={60} label={f.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{f.name}</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {f.purpose && `${f.purpose} · `}
            {num(toNumber(f.packSize))} {FORMS[f.form].unit} v balení
          </div>
        </div>
        {members.length > 1 && member && (
          <span style={{ height: 32, padding: "0 10px 0 4px", borderRadius: 16, background: "var(--bg)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <Avatar member={member} size={24} />
            {member.name}
          </span>
        )}
      </div>

      <div className="stack">
        <div className="label" id="davka-label">Koľko naraz</div>
        <div className="stepper" role="group" aria-labelledby="davka-label">
          <button type="button" aria-label="Menej" onClick={() => set({ dose: Math.max(0.5, f.dose - 0.5) })}>−</button>
          <div style={{ fontSize: 22, fontWeight: 800 }} aria-live="polite">{doseText(f.dose, f.form)}</div>
          <button type="button" aria-label="Viac" onClick={() => set({ dose: f.dose + 0.5 })}>+</button>
        </div>
      </div>

      <div className="stack" style={{ gap: 8 }}>
        <div className="label">Ako často</div>
        <div className="grid2" style={{ gap: 8 }}>
          {FREQ.map(([value, label]) => (
            <button key={value} type="button" className="choice" aria-pressed={f.frequency === value} onClick={() => set({ frequency: value })}>
              {label}
            </button>
          ))}
        </div>
        {f.frequency === "weekdays" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
            {WEEKDAYS.map(([d, label]) => (
              <button
                key={d}
                type="button"
                className="choice"
                style={{ padding: 0 }}
                aria-pressed={f.weekdays.includes(d)}
                onClick={() => set({ weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d] })}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!asNeeded && (
        <div className="stack" style={{ gap: 8 }}>
          <div className="between" style={{ alignItems: "baseline" }}>
            <div className="label">Kedy</div>
            <button type="button" className="link-btn" style={{ textDecoration: "none", fontWeight: 700, fontSize: 14, minHeight: 32 }} onClick={addCustomTime}>
              + Vlastný čas
            </button>
          </div>
          <div className="grid3">
            {PRESETS.map((p) => (
              <button key={p.time} type="button" className={`time-tile ${p.part}`} aria-pressed={f.times.includes(p.time)} onClick={() => toggleTime(p.time)}>
                <DayPartIcon part={p.part} size={24} />
                <span>{p.label}</span>
                <b>{p.time.replace(/^0/, "")}</b>
              </button>
            ))}
          </div>
          {customTimes.map((t, i) => (
            <div key={i} className="row">
              <input className="field" type="time" aria-label="Vlastný čas" value={t} onChange={(e) => changeCustomTime(t, e.target.value)} />
              <button type="button" className="btn soft" onClick={() => toggleTime(t)}>Zrušiť</button>
            </div>
          ))}
        </div>
      )}

      <div className="stack" style={{ gap: 8 }}>
        <div className="label">S jedlom</div>
        <div className="grid3">
          {MEALS.map(([value, label]) => (
            <button key={value} type="button" className="choice" style={{ minHeight: 44 }} aria-pressed={f.meal === value} onClick={() => set({ meal: value })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!asNeeded && (
        <div className="stack">
          <label className="label" htmlFor="do">Užívať do (nepovinné, napr. antibiotiká)</label>
          <div className="row">
            <input id="do" className="field" type="date" min={ymd(new Date())} value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} />
            {f.endDate && (
              <button type="button" className="btn soft" onClick={() => set({ endDate: "" })}>Zrušiť</button>
            )}
          </div>
        </div>
      )}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="grow" />

      <button type="button" className="btn big green" onClick={save} disabled={saving}>
        <IconCheck size={22} />
        Uložiť liek
      </button>
    </main>
  );
}
