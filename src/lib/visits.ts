import { atTime, daysBetween, parseYmd, shortTime, ymd } from "./dates";
import { daysText } from "./schedule";
import type { Checkup, Doctor, Visit, VisitRemind } from "./types";

export const BRING_OPTIONS = ["Prehľad tlaku", "Zoznam liekov", "Kartička poistenca", "Výsledky"];

export const REMIND_OPTIONS: [VisitRemind, string][] = [
  ["dayBefore", "Deň vopred"],
  ["morning", "Ráno v ten deň"],
  ["hourBefore", "Hodinu vopred"],
];

export const EVERY_OPTIONS: [number, string][] = [
  [6, "Raz za pol roka"],
  [12, "Raz za rok"],
  [24, "Raz za 2 roky"],
  [36, "Raz za 3 roky"],
  [60, "Raz za 5 rokov"],
];

const MONTH_SHORT = ["jan", "feb", "mar", "apr", "máj", "jún", "júl", "aug", "sep", "okt", "nov", "dec"];
const WEEKDAY = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];

export const monthShort = (date: string) => MONTH_SHORT[parseYmd(date).getMonth()];

/** "máj 2028" */
export function monthYear(date: string): string {
  return new Intl.DateTimeFormat("sk-SK", { month: "long", year: "numeric" }).format(parseYmd(date));
}

/** "Dnes o 9:30", "Zajtra o 9:30", "Streda o 9:30", "14. 11. o 9:30" */
export function visitWhen(v: Visit, today: string): string {
  const diff = daysBetween(today, v.date);
  const d = parseYmd(v.date);
  const day =
    diff === 0
      ? "Dnes"
      : diff === 1
        ? "Zajtra"
        : diff > 1 && diff < 7
          ? WEEKDAY[d.getDay()]
          : `${WEEKDAY[d.getDay()]} ${d.getDate()}. ${d.getMonth() + 1}.`;
  return `${day} o ${shortTime(v.time)}`;
}

export function visitTitle(v: Visit, doctors: Doctor[]): string {
  const doc = doctors.find((d) => d.id === v.doctorId);
  return doc ? doc.specialty || doc.name : v.reason || "Návšteva lekára";
}

export const isUpcoming = (v: Visit, now: Date) => atTime(v.date, v.time).getTime() >= now.getTime() - 3600000;

export const byDateAsc = (a: Visit, b: Visit) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

export function addMonths(date: string, months: number): string {
  const d = parseYmd(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return ymd(d);
}

/** Termín ďalšej prehliadky; null, ak ešte nebola. */
export function checkupDue(c: Checkup): string | null {
  return c.lastDate ? addMonths(c.lastDate, c.everyMonths) : null;
}

export function everyText(months: number): string {
  return EVERY_OPTIONS.find(([m]) => m === months)?.[1] ?? `Raz za ${months} mesiacov`;
}

export type Badge = { text: string; tone: "red" | "amber" | "blue" };

export function checkupBadge(c: Checkup, today: string): Badge {
  const due = checkupDue(c);
  if (!due) return { text: "objednať sa", tone: "amber" };
  const diff = daysBetween(today, due);
  if (diff < 0) return { text: "po termíne", tone: "red" };
  if (diff === 0) return { text: "dnes", tone: "amber" };
  if (diff < 14) return { text: `o ${daysText(diff)}`, tone: "amber" };
  if (diff <= 45) return { text: "o mesiac", tone: "amber" };
  if (diff <= 75) return { text: "o 2 mesiace", tone: "amber" };
  return { text: monthYear(due), tone: "blue" };
}

/** "11/2025" */
export function monthSlashYear(date: string): string {
  const d = parseYmd(date);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

/** Časy pripomienok návštevy v ms. */
export function visitReminderTimes(v: Visit): { kind: VisitRemind; at: number }[] {
  const start = atTime(v.date, v.time);
  const out: { kind: VisitRemind; at: number }[] = [];
  for (const kind of v.remind) {
    if (kind === "hourBefore") out.push({ kind, at: start.getTime() - 3600000 });
    if (kind === "morning") out.push({ kind, at: atTime(v.date, "07:00").getTime() });
    if (kind === "dayBefore") {
      const d = parseYmd(v.date);
      d.setDate(d.getDate() - 1);
      d.setHours(18, 0, 0, 0);
      out.push({ kind, at: d.getTime() });
    }
  }
  return out;
}

export const mapUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/**
 * Z textu zdieľaného z mapy vyberie odkaz a prípadný názov miesta.
 * Google Mapy pri zdieľaní posielajú názov a pod ním odkaz.
 */
export function parseMapShare(text: string): { link: string; label: string } | null {
  const match = text.match(/https:\/\/[^\s<>"]+/);
  if (!match) return null;
  const link = match[0].replace(/[),.;]+$/, "");
  try {
    new URL(link);
  } catch {
    return null;
  }
  const label = text
    .slice(0, match.index)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)[0] ?? "";
  return { link, label };
}

export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
