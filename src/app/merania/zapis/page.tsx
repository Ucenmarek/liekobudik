"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DayPartIcon, IconBack, IconCheck } from "@/components/Icons";
import { MemberFilter } from "@/components/ui";
import { hm, ymd } from "@/lib/dates";
import { db, uid } from "@/lib/db";
import { useMemberFilter } from "@/lib/hooks";
import { partNow } from "@/lib/readings";
import type { Reading, ReadingPart } from "@/lib/types";

interface Draft {
  memberId: string;
  part: ReadingPart;
  sys: string;
  dia: string;
  pulse: string;
  date: string;
  time: string;
  note: string;
  original?: Reading;
}

const digits = (s: string) => s.replace(/\D/g, "").slice(0, 3);

export default function ZapisPage() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const members = useLiveQuery(() => db.members.orderBy("order").toArray(), []);
  const [filter] = useMemberFilter();
  const [f, setF] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (f || !members) return;
    if (members.length === 0) {
      router.replace("/uvod");
      return;
    }
    if (id) {
      db.readings.get(id).then((r) => {
        if (!r) {
          router.replace("/merania");
          return;
        }
        setF({
          memberId: r.memberId,
          part: r.part,
          sys: String(r.sys),
          dia: String(r.dia),
          pulse: r.pulse ? String(r.pulse) : "",
          date: r.date,
          time: r.time,
          note: r.note ?? "",
          original: r,
        });
      });
      return;
    }
    const now = new Date();
    const wanted = params.get("m") || filter;
    const part = params.get("part");
    setF({
      memberId: members.find((m) => m.id === wanted)?.id ?? members[0].id,
      part: part === "morning" || part === "evening" ? part : partNow(now),
      sys: "",
      dia: "",
      pulse: "",
      date: ymd(now),
      time: hm(now),
      note: "",
    });
  }, [f, members, id, filter, params, router]);

  if (!f || !members) return <div className="screen" />;

  const set = (patch: Partial<Draft>) => {
    setError("");
    setF((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  async function save() {
    if (!f) return;
    const sys = Number(f.sys);
    const dia = Number(f.dia);
    const pulse = f.pulse ? Number(f.pulse) : undefined;
    if (!f.sys || !f.dia) {
      setError("Zapíšte horný aj dolný tlak.");
      return;
    }
    if (sys < 50 || sys > 300 || dia < 30 || dia > 200 || dia >= sys) {
      setError("Skontrolujte hodnoty. Horný tlak býva vyšší ako dolný.");
      return;
    }
    if (pulse !== undefined && (pulse < 20 || pulse > 250)) {
      setError("Skontrolujte pulz.");
      return;
    }
    if (!f.date || !f.time) {
      setError("Doplňte dátum a čas merania.");
      return;
    }
    await db.readings.put({
      id: f.original?.id ?? uid(),
      memberId: f.memberId,
      part: f.part,
      sys,
      dia,
      pulse,
      date: f.date,
      time: f.time,
      note: f.note.trim() || undefined,
      at: f.original?.at ?? Date.now(),
    });
    router.replace("/merania");
  }

  async function remove() {
    if (!f?.original) return;
    await db.readings.delete(f.original.id);
    router.replace("/merania");
  }

  return (
    <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
      <div className="row">
        <Link href="/merania" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small grow">{f.original ? "Upraviť meranie" : "Zapísať tlak"}</h1>
      </div>

      <MemberFilter members={members} value={f.memberId} onChange={(memberId) => set({ memberId })} all={false} />

      <div className="grid2" style={{ gap: 10 }} role="group" aria-label="Kedy">
        <button type="button" className="part-btn morning" aria-pressed={f.part === "morning"} onClick={() => set({ part: "morning" })}>
          <DayPartIcon part="morning" />
          Ráno
        </button>
        <button type="button" className="part-btn evening" aria-pressed={f.part === "evening"} onClick={() => set({ part: "evening" })}>
          <DayPartIcon part="evening" />
          Večer
        </button>
      </div>

      <div className="grid3" style={{ gap: 10 }}>
        <div className="bp-field">
          <label htmlFor="horny" style={{ color: "#a3243b" }}>Horný</label>
          <input id="horny" type="text" inputMode="numeric" autoComplete="off" placeholder="120" value={f.sys} onChange={(e) => set({ sys: digits(e.target.value) })} />
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>mmHg</span>
        </div>
        <div className="bp-field">
          <label htmlFor="dolny" style={{ color: "#0b5d64" }}>Dolný</label>
          <input id="dolny" type="text" inputMode="numeric" autoComplete="off" placeholder="80" value={f.dia} onChange={(e) => set({ dia: digits(e.target.value) })} />
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>mmHg</span>
        </div>
        <div className="bp-field">
          <label htmlFor="pulz" className="muted">Pulz</label>
          <input id="pulz" type="text" inputMode="numeric" autoComplete="off" placeholder="–" value={f.pulse} onChange={(e) => set({ pulse: digits(e.target.value) })} />
          <span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>za minútu</span>
        </div>
      </div>

      <div className="grid2">
        <div className="stack">
          <label className="label" htmlFor="datum">Dátum</label>
          <input id="datum" className="field" type="date" max={ymd(new Date())} value={f.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
        <div className="stack">
          <label className="label" htmlFor="cas">Čas merania</label>
          <input id="cas" className="field" type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
        </div>
      </div>

      <div className="stack">
        <label className="label" htmlFor="poznamka">Poznámka (nepovinné)</label>
        <input id="poznamka" className="field" type="text" autoComplete="off" placeholder="napr. po zlej noci, po káve" value={f.note} onChange={(e) => set({ note: e.target.value })} />
      </div>

      {error && <div className="error" role="alert">{error}</div>}
      <div className="grow" />

      <button type="button" className="btn big green" onClick={save}>
        <IconCheck size={22} />
        Uložiť meranie
      </button>

      {f.original &&
        (confirmDelete ? (
          <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div>Odstrániť toto meranie? Nedá sa to vrátiť.</div>
            <div className="grid2">
              <button type="button" className="btn outline" onClick={() => setConfirmDelete(false)}>Ponechať</button>
              <button type="button" className="btn danger" onClick={remove}>Odstrániť</button>
            </div>
          </div>
        ) : (
          <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
            Odstrániť meranie
          </button>
        ))}
    </main>
  );
}
