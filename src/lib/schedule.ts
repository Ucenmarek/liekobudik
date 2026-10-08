import { atTime, daysBetween, parseYmd, ymd } from "./dates";
import type { Form, Intake, Medicine } from "./types";

export const doseKey = (medId: string, date: string, time: string) =>
  `${medId}|${date}|${time}`;

export const FORMS: Record<
  Form,
  { label: string; one: string; few: string; many: string; frac: string; unit: string }
> = {
  tableta: { label: "tableta", one: "tableta", few: "tablety", many: "tabliet", frac: "tablety", unit: "ks" },
  kapsula: { label: "kapsula", one: "kapsula", few: "kapsuly", many: "kapsúl", frac: "kapsuly", unit: "ks" },
  kvapky: { label: "kvapky", one: "kvapka", few: "kvapky", many: "kvapiek", frac: "kvapky", unit: "ks" },
  ml: { label: "sirup (ml)", one: "ml", few: "ml", many: "ml", frac: "ml", unit: "ml" },
  vdych: { label: "vdych", one: "vdych", few: "vdychy", many: "vdychov", frac: "vdychu", unit: "ks" },
};

export const num = (n: number) => String(n).replace(".", ",");

/** "1 tableta", "2 tablety", "5 tabliet", "0,5 tablety" */
export function doseText(n: number, form: Form): string {
  const f = FORMS[form];
  if (!Number.isInteger(n)) return `${num(n)} ${f.frac}`;
  if (n === 1) return `1 ${f.one}`;
  if (n >= 2 && n <= 4) return `${n} ${f.few}`;
  return `${n} ${f.many}`;
}

export function daysText(n: number): string {
  if (n === 1) return "1 deň";
  if (n >= 2 && n <= 4) return `${n} dni`;
  return `${n} dní`;
}

export function isScheduledOn(med: Medicine, date: string): boolean {
  if (med.frequency === "asneeded") return false;
  if (date < med.startDate) return false;
  if (med.endDate && date > med.endDate) return false;
  if (med.frequency === "daily") return true;
  if (med.frequency === "weekdays") return med.weekdays.includes(parseYmd(date).getDay());
  return daysBetween(med.startDate, date) % 2 === 0;
}

export interface Dose {
  key: string;
  med: Medicine;
  date: string;
  time: string;
  intake?: Intake;
}

/** Plánované dávky na daný deň, zoradené podľa času. */
export function dosesForDate(meds: Medicine[], intakes: Intake[], date: string): Dose[] {
  const byId = new Map(intakes.map((i) => [i.id, i]));
  const out: Dose[] = [];
  for (const med of meds) {
    if (!isScheduledOn(med, date)) continue;
    const createdDay = ymd(new Date(med.createdAt));
    for (const time of med.times) {
      const key = doseKey(med.id, date, time);
      const intake = byId.get(key);
      // Liek pridaný dnes poobede nemá ráno "zmeškanú" dávku.
      if (!intake && date === createdDay && atTime(date, time).getTime() < med.createdAt) continue;
      out.push({ key, med, date, time, intake });
    }
  }
  return out.sort((a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name, "sk"));
}

/** Priemerná denná spotreba v kusoch. */
export function dailyUse(med: Medicine): number {
  const perDay = med.times.length * med.dose;
  if (med.frequency === "daily") return perDay;
  if (med.frequency === "weekdays") return (perDay * med.weekdays.length) / 7;
  if (med.frequency === "alternate") return perDay / 2;
  return 0;
}

/** Na koľko dní vystačí zásoba; null pri liekoch podľa potreby. */
export function daysLeft(med: Medicine): number | null {
  const use = dailyUse(med);
  if (use <= 0) return null;
  return Math.floor(med.stock / use);
}

export function isLow(med: Medicine): boolean {
  const left = daysLeft(med);
  if (left === null) return med.stock < med.dose;
  return left <= med.warnDays;
}

export type DayPart = "morning" | "noon" | "evening";

export function dayPart(time: string): DayPart {
  const h = Number(time.slice(0, 2));
  if (h < 11) return "morning";
  if (h < 17) return "noon";
  return "evening";
}
