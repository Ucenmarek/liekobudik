"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack, IconCheck } from "@/components/Icons";
import { MemberFilter } from "@/components/ui";
import { ymd } from "@/lib/dates";
import { db, uid } from "@/lib/db";
import { useMemberFilter } from "@/lib/hooks";
import type { Checkup, Visit, VisitRemind } from "@/lib/types";
import { BRING_OPTIONS, EVERY_OPTIONS, REMIND_OPTIONS, checkupDue, monthYear } from "@/lib/visits";

interface Draft {
  kind: "visit" | "checkup";
  memberId: string;
  doctorId: string;
  // návšteva
  date: string;
  time: string;
  reason: string;
  bring: string[];
  remind: VisitRemind[];
  // preventívna prehliadka
  name: string;
  everyMonths: number;
  lastDate: string;
  visit?: Visit;
  checkup?: Checkup;
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

export default function NavstevaPage() {
  const router = useRouter();
  const params = useSearchParams();
  const visitId = params.get("id");
  const checkupId = params.get("checkup");
  const data = useLiveQuery(async () => {
    const [members, doctors] = await Promise.all([db.members.orderBy("order").toArray(), db.doctors.toArray()]);
    return { members, doctors };
  }, []);
  const [filter] = useMemberFilter();
  const [f, setF] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newDoctor, setNewDoctor] = useState<{ specialty: string; name: string; phone: string } | null>(null);

  useEffect(() => {
    if (f || !data) return;
    const { members } = data;
    if (members.length === 0) {
      router.replace("/uvod");
      return;
    }
    const base: Draft = {
      kind: "visit",
      memberId: members.find((m) => m.id === filter)?.id ?? members[0].id,
      doctorId: "",
      date: "",
      time: "09:00",
      reason: "",
      bring: [],
      remind: ["dayBefore", "morning"],
      name: "",
      everyMonths: 12,
      lastDate: "",
    };
    if (visitId) {
      db.visits.get(visitId).then((v) => {
        if (!v) return router.replace("/lekari");
        setF({ ...base, memberId: v.memberId, doctorId: v.doctorId ?? "", date: v.date, time: v.time, reason: v.reason, bring: v.bring, remind: v.remind, visit: v });
      });
    } else if (checkupId) {
      db.checkups.get(checkupId).then((c) => {
        if (!c) return router.replace("/lekari");
        setF({ ...base, kind: "checkup", memberId: c.memberId, doctorId: c.doctorId ?? "", name: c.name, everyMonths: c.everyMonths, lastDate: c.lastDate ?? "", checkup: c });
      });
    } else {
      setF(base);
    }
  }, [f, data, filter, visitId, checkupId, router]);

  if (!f || !data) return <div className="screen" />;

  const { members, doctors } = data;
  const editing = Boolean(f.visit || f.checkup);
  const today = ymd(new Date());
  const set = (patch: Partial<Draft>) => {
    setError("");
    setF((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  async function addDoctor() {
    if (!newDoctor) return;
    if (!newDoctor.specialty.trim() && !newDoctor.name.trim()) {
      setError("Napíšte odbornosť alebo meno lekára.");
      return;
    }
    const id = uid();
    await db.doctors.add({ id, specialty: newDoctor.specialty.trim(), name: newDoctor.name.trim(), phone: newDoctor.phone.trim() || undefined });
    setNewDoctor(null);
    set({ doctorId: id });
  }

  async function save() {
    if (!f) return;
    if (f.kind === "visit") {
      if (!f.date || !f.time) {
        setError("Doplňte dátum a čas návštevy.");
        return;
      }
      await db.visits.put({
        id: f.visit?.id ?? uid(),
        memberId: f.memberId,
        doctorId: f.doctorId || undefined,
        date: f.date,
        time: f.time,
        reason: f.reason.trim(),
        bring: f.bring,
        remind: f.remind,
        createdAt: f.visit?.createdAt ?? Date.now(),
      });
    } else {
      if (!f.name.trim()) {
        setError("Napíšte, o akú prehliadku ide.");
        return;
      }
      await db.checkups.put({
        id: f.checkup?.id ?? uid(),
        memberId: f.memberId,
        doctorId: f.doctorId || undefined,
        name: f.name.trim(),
        everyMonths: f.everyMonths,
        lastDate: f.lastDate || undefined,
        createdAt: f.checkup?.createdAt ?? Date.now(),
      });
    }
    router.replace("/lekari");
  }

  async function remove() {
    if (f?.visit) await db.visits.delete(f.visit.id);
    if (f?.checkup) await db.checkups.delete(f.checkup.id);
    router.replace("/lekari");
  }

  const nextDue = f.kind === "checkup" && f.lastDate ? checkupDue({ id: "", memberId: "", name: "", createdAt: 0, everyMonths: f.everyMonths, lastDate: f.lastDate }) : null;
  const title = f.visit ? "Upraviť návštevu" : f.checkup ? "Upraviť prehliadku" : f.kind === "visit" ? "Nová návšteva" : "Nová prehliadka";

  return (
    <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
      <div className="row">
        <Link href="/lekari" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small grow">{title}</h1>
      </div>

      <MemberFilter members={members} value={f.memberId} onChange={(memberId) => set({ memberId })} all={false} />

      {!editing && (
        <div className="grid2" style={{ gap: 8 }} role="group" aria-label="Druh">
          <button type="button" className="choice" aria-pressed={f.kind === "visit"} onClick={() => set({ kind: "visit" })}>Návšteva</button>
          <button type="button" className="choice" aria-pressed={f.kind === "checkup"} onClick={() => set({ kind: "checkup" })}>Preventívna</button>
        </div>
      )}

      {f.kind === "checkup" && (
        <div className="stack">
          <label className="label" htmlFor="nazov">Aká prehliadka</label>
          <input id="nazov" className="field" type="text" autoComplete="off" placeholder="napr. Zubár, Všeobecná prehliadka" value={f.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
      )}

      <div className="stack">
        <div className="between" style={{ alignItems: "baseline" }}>
          <label className="label" htmlFor="lekar">U koho{f.kind === "checkup" ? " (nepovinné)" : ""}</label>
          {!newDoctor && (
            <button type="button" className="link-btn" style={{ textDecoration: "none", fontWeight: 700, fontSize: 14, minHeight: 32 }} onClick={() => setNewDoctor({ specialty: "", name: "", phone: "" })}>
              + Nový lekár
            </button>
          )}
        </div>
        {newDoctor ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, border: "2px solid var(--blue)" }}>
            <input className="field" type="text" aria-label="Odbornosť" placeholder="Odbornosť, napr. Kardiológ" autoComplete="off" value={newDoctor.specialty} onChange={(e) => setNewDoctor({ ...newDoctor, specialty: e.target.value })} />
            <input className="field" type="text" aria-label="Meno lekára" placeholder="Meno lekára" autoComplete="off" value={newDoctor.name} onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })} />
            <input className="field" type="tel" inputMode="tel" aria-label="Telefón" placeholder="Telefón (nepovinné)" autoComplete="off" value={newDoctor.phone} onChange={(e) => setNewDoctor({ ...newDoctor, phone: e.target.value })} />
            <div className="grid2">
              <button type="button" className="btn outline" onClick={() => setNewDoctor(null)}>Zrušiť</button>
              <button type="button" className="btn" onClick={addDoctor}>Pridať lekára</button>
            </div>
          </div>
        ) : (
          <select id="lekar" className="field" value={f.doctorId} onChange={(e) => set({ doctorId: e.target.value })}>
            <option value="">{doctors.length ? "Nevybraný" : "Zatiaľ žiadny lekár"}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{[d.specialty, d.name].filter(Boolean).join(" · ")}</option>
            ))}
          </select>
        )}
      </div>

      {f.kind === "visit" ? (
        <>
          <div className="grid2">
            <div className="stack">
              <label className="label" htmlFor="datum">Dátum</label>
              <input id="datum" className="field" type="date" value={f.date} onChange={(e) => set({ date: e.target.value })} />
            </div>
            <div className="stack">
              <label className="label" htmlFor="cas">Čas</label>
              <input id="cas" className="field" type="time" value={f.time} onChange={(e) => set({ time: e.target.value })} />
            </div>
          </div>

          <div className="stack">
            <label className="label" htmlFor="dovod">Dôvod návštevy</label>
            <input id="dovod" className="field" type="text" autoComplete="off" placeholder="napr. kontrola tlaku" value={f.reason} onChange={(e) => set({ reason: e.target.value })} />
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <div className="label">Vziať so sebou</div>
            <div className="pills">
              {BRING_OPTIONS.map((b) => (
                <button key={b} type="button" className="pill" aria-pressed={f.bring.includes(b)} onClick={() => set({ bring: toggle(f.bring, b) })}>{b}</button>
              ))}
            </div>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            <div className="label">Pripomenúť</div>
            <div className="pills">
              {REMIND_OPTIONS.map(([value, label]) => (
                <button key={value} type="button" className="pill" aria-pressed={f.remind.includes(value)} onClick={() => set({ remind: toggle(f.remind, value) })}>{label}</button>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 13 }}>Deň vopred o 18:00, ráno o 7:00. Pripomienka príde, ak je v Nastaveniach zapnutý budík.</div>
          </div>
        </>
      ) : (
        <>
          <div className="grid2">
            <div className="stack">
              <label className="label" htmlFor="ako">Ako často</label>
              <select id="ako" className="field" value={f.everyMonths} onChange={(e) => set({ everyMonths: Number(e.target.value) })}>
                {EVERY_OPTIONS.map(([m, label]) => (
                  <option key={m} value={m}>{label}</option>
                ))}
              </select>
            </div>
            <div className="stack">
              <label className="label" htmlFor="naposledy">Naposledy</label>
              <input id="naposledy" className="field" type="date" max={today} value={f.lastDate} onChange={(e) => set({ lastDate: e.target.value })} />
            </div>
          </div>
          <div className="note amber">
            <div>
              {nextDue
                ? <>Ďalšia prehliadka vychádza na <strong>{monthYear(nextDue)}</strong>. Liekobudík ju pripomenie dva týždne vopred.</>
                : "Ak neviete, kedy ste boli naposledy, nechajte dátum prázdny. Prehliadka sa ukáže ako „objednať sa“."}
            </div>
          </div>
          {f.checkup && (
            <button type="button" className="btn soft" onClick={() => set({ lastDate: today })}>Absolvované dnes</button>
          )}
        </>
      )}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="grow" />

      <button type="button" className="btn big green" onClick={save}>
        <IconCheck size={22} />
        {f.kind === "visit" ? "Uložiť návštevu" : "Uložiť prehliadku"}
      </button>

      {editing &&
        (confirmDelete ? (
          <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div>{f.visit ? "Odstrániť túto návštevu?" : "Odstrániť túto prehliadku?"} Nedá sa to vrátiť.</div>
            <div className="grid2">
              <button type="button" className="btn outline" onClick={() => setConfirmDelete(false)}>Ponechať</button>
              <button type="button" className="btn danger" onClick={remove}>Odstrániť</button>
            </div>
          </div>
        ) : (
          <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
            {f.visit ? "Odstrániť návštevu" : "Odstrániť prehliadku"}
          </button>
        ))}
    </main>
  );
}
