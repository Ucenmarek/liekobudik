"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DayPartIcon, IconBell, IconCheck, IconHeart, IconMinus, IconPlus, IconSettings, IconWarn } from "@/components/Icons";
import { BottomNav, MemberFilter } from "@/components/ui";
import { atTime, hm, longDate, shortTime, ymd } from "@/lib/dates";
import { db, takeDose, undoDose } from "@/lib/db";
import { snooze, useMemberFilter, useNow, useSnoozes } from "@/lib/hooks";
import { currentSubscription, enablePush, pushSupported, serverInfo } from "@/lib/push";
import { PART_LABEL, newestFirst, partNow } from "@/lib/readings";
import { byDateAsc, isUpcoming, visitTitle, visitWhen } from "@/lib/visits";
import { FORMS, dayPart, daysLeft, daysText, doseText, dosesForDate, isLow, num } from "@/lib/schedule";

export default function DnesPage() {
  const router = useRouter();
  const now = useNow();
  const today = ymd(now);
  const snoozes = useSnoozes();
  const [filter, setFilter] = useMemberFilter();
  /** Ponúknuť zapnutie budíka: server je nastavený a toto zariadenie ho ešte nemá. */
  const [offerAlarm, setOfferAlarm] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!pushSupported() || Notification.permission === "denied") return;
      if (await currentSubscription()) return;
      if ((await serverInfo()).enabled && alive) setOfferAlarm(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const data = useLiveQuery(async () => {
    const [members, medicines, intakes] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.medicines.toArray(),
      db.intakes.where("date").equals(today).toArray(),
    ]);
    // Tlak: karta sa ukáže len tomu, kto si ho už niekedy zapísal.
    const bpMember = members.find((m) => m.id === filter) ?? members[0];
    const bpCount = bpMember ? await db.readings.where("memberId").equals(bpMember.id).count() : 0;
    const bpToday = bpMember && bpCount > 0
      ? (await db.readings.where("date").equals(today).toArray()).filter((r) => r.memberId === bpMember.id)
      : [];
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const [visits, doctors] = await Promise.all([
      db.visits.where("date").between(today, ymd(tomorrow), true, true).toArray(),
      db.doctors.toArray(),
    ]);
    return { members, medicines, intakes, bpMember, bpCount, bpToday, visits, doctors };
  }, [today, filter]);

  useEffect(() => {
    if (data && data.members.length === 0) router.replace("/uvod");
  }, [data, router]);

  if (!data || data.members.length === 0) return <div className="screen" />;

  const { members, intakes } = data;
  const memberId = members.some((m) => m.id === filter) ? filter : "all";
  const medicines = data.medicines.filter((m) => memberId === "all" || m.memberId === memberId);
  const memberOf = (id: string) => members.find((m) => m.id === id);
  const many = members.length > 1;

  const doses = dosesForDate(medicines, intakes, today);
  const taken = doses.filter((d) => d.intake?.status === "taken").length;
  const next = doses.find((d) => !d.intake);
  const low = medicines.filter(isLow);
  const t = now.getTime();
  const nextDue = !!next && atTime(today, next.time).getTime() <= t;

  async function enableNotifications() {
    await enablePush();
    setOfferAlarm(false);
  }

  return (
    <>
      <main className="screen has-nav">
        <div className="between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="muted" style={{ fontSize: 14, fontWeight: 600 }}>{longDate(now)}</div>
            <h1 className="h1" style={{ marginTop: 2 }}>Dnes</h1>
          </div>
          <Link href="/nastavenia" className="icon-btn" aria-label="Nastavenia">
            <IconSettings />
          </Link>
        </div>

        <MemberFilter members={members} value={memberId} onChange={setFilter} />

        {medicines.length === 0 && (
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Zatiaľ tu nie je žiadny liek</div>
              <div className="muted" style={{ fontSize: 15, marginTop: 2 }}>
                Pridajte prvý liek a Liekobudík vám ho začne pripomínať.
              </div>
            </div>
            <Link href="/lieky/liek" className="btn">
              <IconPlus size={18} />
              Pridať liek
            </Link>
          </div>
        )}

        {next && (
          <div className="next">
            <div className="between" style={{ alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {nextDue ? "Čas na liek" : "Ďalšia dávka"}
                </div>
                <div className="time">{shortTime(next.time)}</div>
              </div>
              <div style={{ textAlign: "right", minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>{next.med.name}</div>
                <div style={{ fontSize: 14 }}>
                  {many && `${memberOf(next.med.memberId)?.name ?? ""} · `}
                  {doseText(next.med.dose, next.med.form)}
                </div>
                {(snoozes[next.key] ?? 0) > t && (
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    Odložené do {shortTime(hm(new Date(snoozes[next.key])))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: nextDue ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 10 }}>
              <button type="button" className="white" onClick={() => takeDose(next.med.id, today, next.time)}>
                Užité
              </button>
              {nextDue && (
                <button type="button" className="ghost" onClick={() => snooze(next.key, 15)}>
                  Odložiť o 15 min
                </button>
              )}
            </div>
          </div>
        )}

        {!next && doses.length > 0 && (
          <div className="note green" style={{ padding: 16 }}>
            <IconCheck size={24} />
            <div style={{ fontSize: 16 }}>
              <strong>Na dnes je všetko hotové.</strong>
            </div>
          </div>
        )}

        {data.visits
          .filter((v) => (memberId === "all" || v.memberId === memberId) && isUpcoming(v, now))
          .sort(byDateAsc)
          .map((v) => (
            <Link key={v.id} href="/lekari" className="visit-card" style={{ padding: "12px 14px", borderRadius: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {many ? `${memberOf(v.memberId)?.name ?? ""} · ` : ""}Návšteva lekára
                </div>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {visitWhen(v, today)} · {visitTitle(v, data.doctors)}
                </div>
                {v.bring.length > 0 && <div style={{ fontSize: 13 }}>Vziať: {v.bring.join(", ").toLowerCase()}</div>}
              </div>
            </Link>
          ))}

        {low.map((m) => {
          const left = daysLeft(m);
          return (
            <Link key={m.id} href="/lieky" className="note amber" style={{ textDecoration: "none" }}>
              <IconWarn />
              <div style={{ flex: 1 }}>
                {m.stock <= 0 ? (
                  <strong>{m.name} sa minul.</strong>
                ) : (
                  <>
                    <strong>{m.name} dochádza.</strong> Ostáva {num(m.stock)} {FORMS[m.form].unit}
                    {left !== null && `, vystačí na ${daysText(left)}`}.
                  </>
                )}
              </div>
            </Link>
          );
        })}

        {doses.length > 0 && (
          <section className="stack" style={{ gap: 8 }}>
            <div className="between" style={{ alignItems: "baseline" }}>
              <h2 className="h2">Dnešné lieky</h2>
              <div className="muted" style={{ fontSize: 14, fontWeight: 600 }}>
                {taken} z {doses.length} užité
              </div>
            </div>
            <div className="card" style={{ padding: "4px 14px" }}>
              {doses.map((d) => {
                const status = d.intake?.status;
                const late = !status && t - atTime(today, d.time).getTime() > 60 * 60000;
                const who = memberOf(d.med.memberId);
                return (
                  <div key={d.key} className={`dose${status ? " done" : ""}${late ? " late" : ""}`}>
                    <span className={`part ${dayPart(d.time)}`}>
                      <DayPartIcon part={dayPart(d.time)} />
                    </span>
                    <div className="t">{d.time}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">{d.med.name}</div>
                      <div className="sub">
                        {many && who && (
                          <>
                            <strong style={{ color: who.color }}>{who.name}</strong> ·{" "}
                          </>
                        )}
                        {status === "taken"
                          ? `užité o ${shortTime(hm(new Date(d.intake!.at)))}`
                          : status === "skipped"
                            ? "preskočené"
                            : late
                              ? `ešte neužité · ${doseText(d.med.dose, d.med.form)}`
                              : doseText(d.med.dose, d.med.form)}
                      </div>
                    </div>
                    {status ? (
                      <button
                        type="button"
                        className={`check ${status}`}
                        aria-label={`Zrušiť: ${d.med.name} ${d.time}`}
                        onClick={() => undoDose(d.med.id, today, d.time)}
                      >
                        <span>
                          {status === "taken" ? (
                            <IconCheck size={16} stroke="#fff" />
                          ) : (
                            <IconMinus size={16} stroke="#fff" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="check"
                        aria-label={`Označiť ako užité: ${d.med.name} ${d.time}`}
                        onClick={() => takeDose(d.med.id, today, d.time)}
                      >
                        <span />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {medicines.length > 0 && doses.length === 0 && (
          <div className="card muted" style={{ padding: 16, fontSize: 15 }}>
            Na dnes nie je naplánovaný žiadny liek.
          </div>
        )}

        {data.bpMember && data.bpCount > 0 && (() => {
          const latest = [...data.bpToday].sort(newestFirst)[0];
          const missing = (["morning", "evening"] as const).filter((p) => !data.bpToday.some((r) => r.part === p));
          const add = missing.includes(partNow(now)) ? partNow(now) : missing.includes("evening") ? "evening" : undefined;
          return (
            <div className="card row" style={{ padding: 14, gap: 14 }}>
              <span style={{ width: 46, height: 46, borderRadius: 14, background: "var(--red-soft)", color: "var(--red)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <IconHeart size={24} />
              </span>
              <Link href="/merania" style={{ flex: 1, minWidth: 0, color: "inherit", textDecoration: "none" }}>
                <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
                  {many ? `${data.bpMember.name} · tlak` : "Môj tlak"} {latest ? `dnes ${PART_LABEL[latest.part]}` : "dnes"}
                </div>
                {latest ? (
                  <div className="tnum" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                    {latest.sys}/{latest.dia}
                    {latest.pulse ? <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}> pulz {latest.pulse}</span> : null}
                  </div>
                ) : (
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Ešte nezapísaný</div>
                )}
              </Link>
              {add && (
                <Link href={`/merania/zapis?m=${data.bpMember.id}&part=${add}`} className="btn" style={{ background: "#e8e1fb", color: "#3b2a80" }}>
                  + {add === "morning" ? "Ráno" : "Večer"}
                </Link>
              )}
            </div>
          );
        })()}

        {offerAlarm && medicines.length > 0 && (
          <div className="note yellow">
            <IconBell size={24} />
            <div style={{ flex: 1 }}>Zapnite budík, aby sa liek pripomenul, aj keď je appka zavretá.</div>
            <button type="button" className="btn" onClick={enableNotifications}>
              Zapnúť
            </button>
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
