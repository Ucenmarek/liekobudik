"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { BpChart, BpLegend } from "@/components/BpChart";
import { DayPartIcon, IconPlus, IconReport } from "@/components/Icons";
import { BottomNav, MemberFilter } from "@/components/ui";
import { shortTime, ymd } from "@/lib/dates";
import { db } from "@/lib/db";
import { useMemberFilter, useNow } from "@/lib/hooks";
import { average, lastDays, newestFirst, readingLabel } from "@/lib/readings";

const fmt = (a: { sys: number; dia: number } | null) => (a ? `${a.sys}/${a.dia}` : "–");

export default function MeraniaPage() {
  const now = useNow(60000);
  const today = ymd(now);
  const [filter, setFilter] = useMemberFilter();
  const [showAll, setShowAll] = useState(false);
  const data = useLiveQuery(async () => {
    const [members, readings] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.readings.toArray(),
    ]);
    return { members, readings };
  }, []);

  if (!data) return <div className="screen" />;

  const { members } = data;
  const memberId = members.some((m) => m.id === filter) ? filter : members[0]?.id;
  const readings = data.readings.filter((r) => r.memberId === memberId).sort(newestFirst);
  const days = lastDays(today, 7);
  const week = readings.filter((r) => r.date >= days[0] && r.date <= today);
  const shown = showAll ? readings : readings.slice(0, 6);

  return (
    <>
      <main className="screen has-nav">
        <div className="between">
          <h1 className="h1">Tlak</h1>
          <Link href={`/merania/zapis?m=${memberId ?? ""}`} className="btn">
            <IconPlus size={18} />
            Zapísať meranie
          </Link>
        </div>

        <MemberFilter members={members} value={memberId ?? ""} onChange={setFilter} all={false} />

        {readings.length === 0 ? (
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Zatiaľ žiadne meranie</div>
            <div className="muted" style={{ fontSize: 15, marginTop: 2 }}>
              Zapisujte si tlak ráno a večer. Pri návšteve lekára mu ukážete prehľad.
            </div>
          </div>
        ) : (
          <>
            <div className="grid2" style={{ gap: 10 }}>
              <div className="avg morning">
                <div style={{ fontSize: 13, fontWeight: 700 }}>Priemer ráno · 7 dní</div>
                <div className="v">{fmt(average(week.filter((r) => r.part === "morning")))}</div>
              </div>
              <div className="avg evening">
                <div style={{ fontSize: 13, fontWeight: 700 }}>Priemer večer · 7 dní</div>
                <div className="v">{fmt(average(week.filter((r) => r.part === "evening")))}</div>
              </div>
            </div>

            <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div className="between">
                <div style={{ fontSize: 15, fontWeight: 700 }}>Posledných 7 dní</div>
                <BpLegend />
              </div>
              <BpChart days={days} readings={week} />
            </div>

            <div className="card" style={{ padding: "4px 14px" }}>
              {shown.map((r) => (
                <Link key={r.id} href={`/merania/zapis?id=${r.id}`} className="reading" aria-label={`Upraviť meranie: ${readingLabel(r, today)}`}>
                  <span className={`part ${r.part}`}>
                    <DayPartIcon part={r.part} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{readingLabel(r, today)}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {shortTime(r.time)}
                      {r.pulse ? ` · pulz ${r.pulse}` : ""}
                      {r.note ? ` · ${r.note}` : ""}
                    </div>
                  </div>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 800 }}>
                    {r.sys}/{r.dia}
                  </div>
                </Link>
              ))}
            </div>

            {readings.length > 6 && !showAll && (
              <button type="button" className="link-btn" onClick={() => setShowAll(true)}>
                Zobraziť všetky merania ({readings.length})
              </button>
            )}

            <Link href={`/merania/prehlad?m=${memberId}`} className="btn outline" style={{ minHeight: 52, borderRadius: 16, fontSize: 16 }}>
              <IconReport size={20} />
              Prehľad pre lekára
            </Link>
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
