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

export interface Doctor {
  id: string;
  name: string;
  /** Odbornosť, napr. "Všeobecný lekár" */
  specialty: string;
  clinic?: string;
  address?: string;
  phone?: string;
  /** Ordinačné hodiny voľným textom */
  hours?: string;
  note?: string;
}

export type VisitRemind = "dayBefore" | "morning" | "hourBefore";

export interface Visit {
  id: string;
  memberId: string;
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  /** Čo vziať so sebou */
  bring: string[];
  remind: VisitRemind[];
  createdAt: number;
}

/** Preventívna prehliadka, ktorá sa pravidelne opakuje. */
export interface Checkup {
  id: string;
  memberId: string;
  name: string;
  doctorId?: string;
  everyMonths: number;
  /** Kedy bola naposledy, "YYYY-MM-DD"; prázdne = ešte nebola */
  lastDate?: string;
  createdAt: number;
}

/** Zdravotná karta člena. Len záznam na ukázanie lekárovi. */
export interface HealthCard {
  memberId: string;
  bloodGroup?: string;
  birthDate?: string;
  insurer?: string;
  height?: string;
  weight?: string;
  drugAllergies: string[];
  otherAllergies?: string;
  cardFront?: Blob;
  cardBack?: Blob;
  conditions?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}

/** Text upozornení pre budík; server ho nevidí, číta ho len toto zariadenie. */
export interface Alarm {
  /** Čas budenia v ms, zaokrúhlený na minútu */
  ts: number;
  items: { key: string; title: string; body: string }[];
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
