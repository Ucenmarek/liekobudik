export type Form = "tableta" | "kapsula" | "kvapky" | "ml" | "vdych";
export type Frequency = "daily" | "weekdays" | "alternate" | "asneeded";
export type Meal = "before" | "after" | "any";

export interface Member {
  id: string;
  name: string;
  color: string;
  note?: string;
  order: number;
}

export interface Medicine {
  id: string;
  memberId: string;
  name: string;
  /** Na čo je */
  purpose: string;
  /** Fotka krabičky */
  photo?: Blob;
  form: Form;
  packSize: number;
  stock: number;
  /** Koľko dní vopred upozorniť na dochádzajúcu zásobu */
  warnDays: number;
  /** Koľko naraz */
  dose: number;
  frequency: Frequency;
  /** 0 = nedeľa … 6 = sobota, len pre frequency "weekdays" */
  weekdays: number[];
  /** Časy "HH:MM" */
  times: string[];
  meal: Meal;
  startDate: string;
  endDate?: string;
  createdAt: number;
}

export interface Intake {
  /** Plánovaná dávka: "medicineId|YYYY-MM-DD|HH:MM", podľa potreby: náhodné id */
  id: string;
  medicineId: string;
  date: string;
  time: string | null;
  status: "taken" | "skipped";
  amount: number;
  at: number;
}

export type ReadingPart = "morning" | "evening";

/** Meranie tlaku. Len záznam, appka hodnoty nevyhodnocuje. */
export interface Reading {
  id: string;
  memberId: string;
  date: string;
  time: string;
  part: ReadingPart;
  /** Horný (systolický) tlak v mmHg */
  sys: number;
  /** Dolný (diastolický) tlak v mmHg */
  dia: number;
  pulse?: number;
  note?: string;
  at: number;
}

export const MEMBER_COLORS = [
  "#0a57c9",
  "#5a40b8",
  "#c2304a",
  "#0b6f78",
  "#8a4b00",
  "#1c6b2a",
  "#1d2b45",
];
