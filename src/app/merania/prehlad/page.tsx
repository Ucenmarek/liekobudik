"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BpChart, BpLegend } from "@/components/BpChart";
import { IconBack, IconReport } from "@/components/Icons";
import { shortDate, shortTime, ymd } from "@/lib/dates";
import { db } from "@/lib/db";
import { average, lastDays } from "@/lib/readings";
import type { Reading } from "@/lib/types";

const fmt = (a: { sys: number; dia: number } | null) => (a ? `${a.sys}/${a.dia}` : "–");
const cell = (list: Reading[]) =>
  list.length === 0
    ? "–"
    : list.map((r) => `${r.sys}/${r.dia}${r.pulse ? ` (${r.pulse})` : ""} ${shortTime(r.time)}`).join(", ");

/** Prehľad meraní na ukázanie alebo vytlačenie pre lekára. */
export default function PrehladPage() {
  const memberId = useSearchParams().get("m") ?? "";
  const [span, setSpan] = useState(30);
  const data = useLiveQuery(async () => {
    const [member, readings] = await Promise.all([
      db.members.get(memberId),
      db.readings.where("memberId").equals(memberId).toArray(),
    ]);
    return { member, readings };
  }, [memberId]);

  if (!data) return <div className="screen" />;

  const today = ymd(new Date());
  const days = lastDays(today, span);
  const readings = data.readings
    .filter((r) => r.date >= days[0] && r.date <= today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const withData = [...days].reverse().filter((d) => readings.some((r) => r.date === d));

  return (
    <main className="screen">
      <div className="row no-print">
        <Link href="/merania" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small grow">Prehľad pre lekára</h1>
      </div>

      <div className="grid3 no-print" role="group" aria-label="Obdobie">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" className="choice" aria-pressed={span === n} onClick={() => setSpan(n)}>
            {n} dní
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Krvný tlak{data.member ? ` · ${data.member.name}` : ""}</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {shortDate(days[0])} – {shortDate(today)} {today.slice(0, 4)} · {readings.length}{" "}
            {readings.length === 1 ? "meranie" : readings.length >= 2 && readings.length <= 4 ? "merania" : "meraní"}
          </div>
        </div>

        <div className="grid2" style={{ gap: 10 }}>
          <div className="avg morning" style={{ padding: "8px 12px", borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Priemer ráno</div>
            <div className="v" style={{ fontSize: 22 }}>{fmt(average(readings.filter((r) => r.part === "morning")))}</div>
          </div>
          <div className="avg evening" style={{ padding: "8px 12px", borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Priemer večer</div>
            <div className="v" style={{ fontSize: 22 }}>{fmt(average(readings.filter((r) => r.part === "evening")))}</div>
          </div>
        </div>

        <div className="between">
          <div style={{ fontSize: 14, fontWeight: 700 }}>Denný priemer</div>
          <BpLegend />
        </div>
        <BpChart days={days} readings={readings} />

        {withData.length > 0 && (
          <table className="report">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Ráno</th>
                <th>Večer</th>
                <th>Poznámka</th>
              </tr>
            </thead>
            <tbody>
              {withData.map((d) => {
                const day = readings.filter((r) => r.date === d);
                return (
                  <tr key={d}>
                    <td style={{ whiteSpace: "nowrap", fontWeight: 700 }}>{shortDate(d)}</td>
                    <td>{cell(day.filter((r) => r.part === "morning"))}</td>
                    <td>{cell(day.filter((r) => r.part === "evening"))}</td>
                    <td>{day.map((r) => r.note).filter(Boolean).join("; ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="muted" style={{ fontSize: 12 }}>Hodnoty v mmHg, pulz v zátvorke. Zapísané v appke Liekobudík.</div>
      </div>

      <button type="button" className="btn big no-print" onClick={() => window.print()}>
        <IconReport size={22} />
        Vytlačiť alebo uložiť ako PDF
      </button>
    </main>
  );
}
