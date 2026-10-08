"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { DayPartIcon, IconClock, IconPlus } from "@/components/Icons";
import { Avatar, BottomNav, MedPhoto, MemberFilter } from "@/components/ui";
import { shortDate, shortTime } from "@/lib/dates";
import { db, restock, takeNow } from "@/lib/db";
import { useMemberFilter } from "@/lib/hooks";
import { FORMS, dayPart, daysLeft, daysText, doseText, isLow, num } from "@/lib/schedule";
import type { Medicine } from "@/lib/types";

const PART_COLOR = { morning: "#7a5200", noon: "#0b5d64", evening: "#4d37a0" };
const WD = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function scheduleText(m: Medicine): string {
  const times =
    m.times.length <= 2
      ? m.times.map(shortTime).join(" a ")
      : m.times.map(shortTime).join(", ");
  const dose = doseText(m.dose, m.form);
  if (m.frequency === "alternate") return `Každý druhý deň ${times} · ${dose}`;
  if (m.frequency === "weekdays") {
    const days = [1, 2, 3, 4, 5, 6, 0].filter((d) => m.weekdays.includes(d)).map((d) => WD[d]);
    return `${days.join(", ")} ${times} · ${dose}`;
  }
  return `${times} · ${dose}`;
}

export default function LiekyPage() {
  const [filter, setFilter] = useMemberFilter();
  const [justTaken, setJustTaken] = useState<string | null>(null);
  const data = useLiveQuery(async () => {
    const [members, medicines] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.medicines.toArray(),
    ]);
    return { members, medicines };
  }, []);

  if (!data) return <div className="screen" />;

  const { members } = data;
  const memberId = members.some((m) => m.id === filter) ? filter : "all";
  const many = members.length > 1;
  const medicines = data.medicines
    .filter((m) => memberId === "all" || m.memberId === memberId)
    .sort(
      (a, b) =>
        Number(a.frequency === "asneeded") - Number(b.frequency === "asneeded") ||
        a.name.localeCompare(b.name, "sk"),
    );

  async function takeNowClick(id: string) {
    await takeNow(id);
    setJustTaken(id);
    setTimeout(() => setJustTaken((v) => (v === id ? null : v)), 2500);
  }

  return (
    <>
      <main className="screen has-nav" style={{ gap: 10 }}>
        <div className="between">
          <h1 className="h1">Lieky</h1>
          <Link href="/lieky/liek" className="btn">
            <IconPlus size={18} />
            Pridať liek
          </Link>
        </div>

        <MemberFilter members={members} value={memberId} onChange={setFilter} />

        {medicines.length === 0 && (
          <div className="card muted" style={{ padding: 16, fontSize: 15 }}>
            Zatiaľ tu nie je žiadny liek. Pridajte prvý tlačidlom hore.
          </div>
        )}

        {medicines.map((m) => {
          const who = members.find((x) => x.id === m.memberId);
          const asNeeded = m.frequency === "asneeded";
          const low = isLow(m);
          const left = daysLeft(m);
          const unit = FORMS[m.form].unit;
          const full = Math.max(m.packSize, 1) * Math.max(1, Math.ceil(m.stock / Math.max(m.packSize, 1)));
          const part = m.times.length === 1 ? dayPart(m.times[0]) : null;
          return (
            <div key={m.id} className={`card${low ? " low" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 8, padding: low ? 10 : 12 }}>
              <div className="row">
                <Link href={`/lieky/liek?id=${m.id}`} className="med-link" aria-label={`Upraviť ${m.name}`}>
                  <MedPhoto blob={m.photo} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="med-name">
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                      {many && who && <Avatar member={who} size={20} />}
                    </div>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {m.purpose}
                      {m.endDate && `${m.purpose ? " · " : ""}do ${shortDate(m.endDate)}`}
                    </div>
                    {asNeeded ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>
                        Podľa potreby · {num(m.stock)} {unit}
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: part ? PART_COLOR[part] : "var(--blue-dark)" }}>
                        {part ? <DayPartIcon part={part} size={15} sw={2.4} /> : <IconClock size={15} sw={2.4} />}
                        {scheduleText(m)}
                      </div>
                    )}
                  </div>
                  {!asNeeded && (
                    <div style={{ textAlign: "right", color: low ? "var(--amber-strong)" : undefined }}>
                      <div className="tnum" style={{ fontSize: 19, fontWeight: 800, whiteSpace: "nowrap" }}>
                        {num(m.stock)} {unit}
                      </div>
                      {left !== null && (
                        <div className={low ? undefined : "muted"} style={{ fontSize: 13, fontWeight: low ? 600 : 400, whiteSpace: "nowrap" }}>
                          na {daysText(left)}
                        </div>
                      )}
                    </div>
                  )}
                </Link>
                {asNeeded && (
                  <button type="button" className="btn outline" style={{ minHeight: 44, fontSize: 14, padding: "0 14px" }} onClick={() => takeNowClick(m.id)} disabled={m.stock < m.dose}>
                    {justTaken === m.id ? "Zapísané" : "Užiť teraz"}
                  </button>
                )}
              </div>
              {!asNeeded && (
                <div className={`bar${low ? " low" : ""}`}>
                  <div style={{ width: `${Math.min(100, Math.round((m.stock / full) * 100))}%` }} />
                </div>
              )}
              {low && m.packSize > 0 && (
                <button type="button" className="btn amber" style={{ minHeight: 44 }} onClick={() => restock(m.id)}>
                  Kúpil som nové balenie (+{m.packSize} {unit})
                </button>
              )}
            </div>
          );
        })}
      </main>
      <BottomNav />
    </>
  );
}
