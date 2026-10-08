import { daysBetween, parseYmd, shortDate, ymd } from "./dates";
import type { Reading, ReadingPart } from "./types";

export const PART_LABEL: Record<ReadingPart, string> = { morning: "ráno", evening: "večer" };

const WEEKDAY = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];
export const WEEKDAY_SHORT = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

/** "Dnes ráno", "Včera večer", "Utorok ráno", "28. 9. večer" */
export function readingLabel(r: Reading, today: string): string {
  const diff = daysBetween(r.date, today);
  const part = PART_LABEL[r.part];
  if (diff === 0) return `Dnes ${part}`;
  if (diff === 1) return `Včera ${part}`;
  if (diff > 1 && diff < 7) return `${WEEKDAY[parseYmd(r.date).getDay()]} ${part}`;
  return `${shortDate(r.date)} ${part}`;
}

export function average(list: Reading[]): { sys: number; dia: number } | null {
  if (list.length === 0) return null;
  const sum = list.reduce((a, r) => ({ sys: a.sys + r.sys, dia: a.dia + r.dia }), { sys: 0, dia: 0 });
  return { sys: Math.round(sum.sys / list.length), dia: Math.round(sum.dia / list.length) };
}

/** Posledných n dní vrátane dneška, od najstaršieho. */
export function lastDays(today: string, n: number): string[] {
  const base = parseYmd(today);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - (n - 1 - i));
    return ymd(d);
  });
}

export const newestFirst = (a: Reading, b: Reading) =>
  b.date.localeCompare(a.date) || b.time.localeCompare(a.time) || b.at - a.at;

/** Ráno do 14:00, potom večer. */
export function partNow(d: Date): ReadingPart {
  return d.getHours() < 14 ? "morning" : "evening";
}
