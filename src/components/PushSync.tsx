"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { ymd } from "@/lib/dates";
import { db } from "@/lib/db";
import { useNow, useSnoozes } from "@/lib/hooks";
import { syncAlarms } from "@/lib/push";

/** Pri každej zmene liekov alebo užití prepočíta budenia a pošle ich časy na server. */
export function PushSync() {
  const today = ymd(useNow(60000));
  const snoozes = useSnoozes();
  const stamp = useLiveQuery(async () => {
    const [medicines, intakes, members, visits, checkups, doctors] = await Promise.all([
      db.medicines.toArray(),
      db.intakes.where("date").equals(today).toArray(),
      db.members.toArray(),
      db.visits.where("date").aboveOrEqual(today).toArray(),
      db.checkups.toArray(),
      db.doctors.toArray(),
    ]);
    return JSON.stringify([
      today,
      medicines.map((m) => [m.id, m.name, m.memberId, m.dose, m.form, m.frequency, m.weekdays, m.times, m.meal, m.startDate, m.endDate]),
      intakes.map((i) => [i.id, i.status]),
      members.map((m) => [m.id, m.name]),
      visits.map((v) => [v.id, v.memberId, v.doctorId, v.date, v.time, v.reason, v.bring, v.remind]),
      checkups.map((c) => [c.id, c.memberId, c.name, c.everyMonths, c.lastDate]),
      doctors.map((d) => [d.id, d.name, d.specialty]),
    ]);
  }, [today]);

  useEffect(() => {
    if (stamp === undefined) return;
    const t = setTimeout(() => {
      syncAlarms().catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [stamp, snoozes]);

  return null;
}
