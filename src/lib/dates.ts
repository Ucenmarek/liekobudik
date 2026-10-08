export const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}

export function atTime(date: string, time: string): Date {
  const d = parseYmd(date);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** "Štvrtok 8. októbra" */
export function longDate(d: Date): string {
  const s = new Intl.DateTimeFormat("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "08:00" -> "8:00" */
export function shortTime(t: string): string {
  return t.replace(/^0/, "");
}

/** "2026-10-12" -> "12. 10." */
export function shortDate(s: string): string {
  const d = parseYmd(s);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}
