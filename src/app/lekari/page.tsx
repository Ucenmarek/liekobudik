"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useState } from "react";
import { IconCard, IconChevron, IconEdit, IconPhone, IconPin, IconPlus, IconShield } from "@/components/Icons";
import { Avatar, BottomNav, MemberFilter } from "@/components/ui";
import { parseYmd, ymd } from "@/lib/dates";
import { db } from "@/lib/db";
import { useMemberFilter, useNow } from "@/lib/hooks";
import {
  byDateAsc,
  checkupBadge,
  checkupDue,
  everyText,
  isUpcoming,
  mapUrl,
  monthShort,
  monthSlashYear,
  telUrl,
  visitTitle,
  visitWhen,
} from "@/lib/visits";

export default function LekariPage() {
  const now = useNow(60000);
  const today = ymd(now);
  const [filter, setFilter] = useMemberFilter();
  const [showPast, setShowPast] = useState(false);
  const data = useLiveQuery(async () => {
    const [members, doctors, visits, checkups] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.doctors.toArray(),
      db.visits.toArray(),
      db.checkups.toArray(),
    ]);
    return { members, doctors, visits, checkups };
  }, []);

  if (!data) return <div className="screen" />;

  const { members } = data;
  const memberId = members.some((m) => m.id === filter) ? filter : "all";
  const mine = <T extends { memberId: string }>(list: T[]) =>
    list.filter((x) => memberId === "all" || x.memberId === memberId);
  const many = members.length > 1;
  const who = (id: string) => members.find((m) => m.id === id);
  const cardMember = memberId === "all" ? members[0]?.id : memberId;

  const visits = mine(data.visits).sort(byDateAsc);
  const upcoming = visits.filter((v) => isUpcoming(v, now));
  const past = visits.filter((v) => !isUpcoming(v, now)).reverse();
  const [next, ...later] = upcoming;
  const checkups = mine(data.checkups).sort((a, b) =>
    (checkupDue(a) ?? "0").localeCompare(checkupDue(b) ?? "0"),
  );
  const doctors = [...data.doctors].sort((a, b) => a.specialty.localeCompare(b.specialty, "sk"));
  const empty = visits.length === 0 && checkups.length === 0 && doctors.length === 0;

  return (
    <>
      <main className="screen has-nav" style={{ gap: 12 }}>
        <div className="between">
          <h1 className="h1">Lekári</h1>
          <Link href="/lekari/navsteva" className="btn" aria-label="Pridať návštevu alebo prehliadku" style={{ width: 46, padding: 0 }}>
            <IconPlus size={20} />
          </Link>
        </div>

        <MemberFilter members={members} value={memberId} onChange={setFilter} />

        {empty && (
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Návštevy, prehliadky a kontakty</div>
              <div className="muted" style={{ fontSize: 15, marginTop: 2 }}>
                Zapíšte si termín u lekára a Liekobudík ho pripomenie. Preventívne prehliadky postráži podľa toho, kedy ste boli naposledy.
              </div>
            </div>
            <Link href="/lekari/navsteva" className="btn">
              <IconPlus size={18} />
              Pridať návštevu
            </Link>
          </div>
        )}

        {next && (
          <>
            <h2 className="h2" style={{ marginTop: 4 }}>Najbližšia návšteva</h2>
            <Link href={`/lekari/navsteva?id=${next.id}`} className="visit-card">
              <div className="daybox">
                <b>{parseYmd(next.date).getDate()}</b>
                {monthShort(next.date)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{visitTitle(next, data.doctors)}</div>
                <div style={{ fontSize: 14 }}>
                  {visitWhen(next, today)}
                  {next.reason && visitTitle(next, data.doctors) !== next.reason ? ` · ${next.reason}` : ""}
                </div>
                {many && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{who(next.memberId)?.name}</div>}
                {next.bring.length > 0 && (
                  <div style={{ fontSize: 13, marginTop: 4 }}>Vziať: {next.bring.join(", ").toLowerCase()}</div>
                )}
              </div>
            </Link>
          </>
        )}

        {later.length > 0 && (
          <div className="card" style={{ padding: "4px 14px" }}>
            {later.map((v) => (
              <Link key={v.id} href={`/lekari/navsteva?id=${v.id}`} className="line">
                <div className="daybox small">
                  <b>{parseYmd(v.date).getDate()}</b>
                  {monthShort(v.date)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{visitTitle(v, data.doctors)}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {many && who(v.memberId) ? `${who(v.memberId)!.name} · ` : ""}
                    {visitWhen(v, today)}
                  </div>
                </div>
                <IconChevron size={18} />
              </Link>
            ))}
          </div>
        )}

        {checkups.length > 0 && (
          <>
            <h2 className="h2" style={{ marginTop: 6 }}>Preventívne prehliadky</h2>
            <div className="card" style={{ padding: "4px 14px" }}>
              {checkups.map((c) => {
                const badge = checkupBadge(c, today);
                return (
                  <Link key={c.id} href={`/lekari/navsteva?checkup=${c.id}`} className="line">
                    <span className="part" style={{ background: badge.tone === "blue" ? "var(--blue-soft)" : "#e8e1fb", color: badge.tone === "blue" ? "var(--blue-dark)" : "#4d37a0" }}>
                      <IconShield />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{c.name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {many && who(c.memberId) ? `${who(c.memberId)!.name} · ` : ""}
                        {everyText(c.everyMonths)}
                        {c.lastDate ? ` · naposledy ${monthSlashYear(c.lastDate)}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${badge.tone}`}>{badge.text}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {cardMember && (
          <Link href={`/lekari/karta?m=${cardMember}`} className="card row" style={{ textDecoration: "none", color: "inherit", minHeight: 64 }}>
            <span className="part" style={{ background: "var(--red-soft)", color: "var(--red)" }}>
              <IconCard />
            </span>
            <div className="grow">
              <div style={{ fontSize: 17, fontWeight: 700 }}>Zdravotná karta</div>
              <div className="muted" style={{ fontSize: 14 }}>Alergie, krvná skupina, lieky, kartička poistenca</div>
            </div>
            <IconChevron size={20} />
          </Link>
        )}

        <div className="between" style={{ marginTop: 6 }}>
          <h2 className="h2">Kontakty</h2>
          <Link href="/lekari/lekar" className="link-btn" style={{ textDecoration: "none", fontWeight: 700 }}>
            + Pridať lekára
          </Link>
        </div>

        {doctors.length === 0 && (
          <div className="card muted" style={{ padding: 16, fontSize: 15 }}>
            Uložte si kontakty na lekárov a ambulancie, aby ste ich mali poruke.
          </div>
        )}

        {doctors.map((d) => (
          <div key={d.id} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{d.name || d.specialty}</div>
                <div className="muted" style={{ fontSize: 14 }}>
                  {[d.name ? d.specialty : "", d.clinic].filter(Boolean).join(" · ")}
                </div>
                {(d.address || d.hours) && (
                  <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                    {[d.address, d.hours].filter(Boolean).join(" · ")}
                  </div>
                )}
                {d.note && <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{d.note}</div>}
              </div>
              <Link href={`/lekari/lekar?id=${d.id}`} className="icon-btn" style={{ border: 0, background: "transparent", color: "var(--muted)" }} aria-label={`Upraviť kontakt ${d.name || d.specialty}`}>
                <IconEdit size={20} />
              </Link>
            </div>
            {(d.phone || d.address) && (
              <div style={{ display: "grid", gridTemplateColumns: d.phone && d.address ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 10 }}>
                {d.phone && (
                  <a href={telUrl(d.phone)} className="btn soft">
                    <IconPhone size={18} />
                    Zavolať
                  </a>
                )}
                {d.address && (
                  <a href={mapUrl(d.address)} target="_blank" rel="noopener noreferrer" className="btn soft">
                    <IconPin size={18} />
                    Mapa
                  </a>
                )}
              </div>
            )}
          </div>
        ))}

        {past.length > 0 && (
          <>
            <button type="button" className="link-btn" onClick={() => setShowPast((v) => !v)}>
              {showPast ? "Skryť minulé návštevy" : `Minulé návštevy (${past.length})`}
            </button>
            {showPast && (
              <div className="card" style={{ padding: "4px 14px" }}>
                {past.map((v) => (
                  <Link key={v.id} href={`/lekari/navsteva?id=${v.id}`} className="line">
                    {many && <Avatar member={who(v.memberId)} size={28} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{visitTitle(v, data.doctors)}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {parseYmd(v.date).getDate()}. {parseYmd(v.date).getMonth() + 1}. {parseYmd(v.date).getFullYear()}
                        {v.reason ? ` · ${v.reason}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <BottomNav />
    </>
  );
}
