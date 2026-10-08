import Dexie, { type Table } from "dexie";
import { ymd } from "./dates";
import { doseKey } from "./schedule";
import type { Intake, Medicine, Member } from "./types";

/**
 * Všetky údaje ostávajú len v tomto zariadení (IndexedDB).
 * Nič sa neposiela na server.
 */
class LiekobudikDB extends Dexie {
  members!: Table<Member, string>;
  medicines!: Table<Medicine, string>;
  intakes!: Table<Intake, string>;

  constructor() {
    super("liekobudik");
    this.version(1).stores({
      members: "id, order",
      medicines: "id, memberId",
      intakes: "id, medicineId, date",
    });
  }
}

export const db = new LiekobudikDB();

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const round = (n: number) => Math.round(n * 100) / 100;

export async function takeDose(medId: string, date: string, time: string) {
  await db.transaction("rw", db.medicines, db.intakes, async () => {
    const id = doseKey(medId, date, time);
    const prev = await db.intakes.get(id);
    if (prev?.status === "taken") return;
    const med = await db.medicines.get(medId);
    if (!med) return;
    await db.intakes.put({
      id,
      medicineId: medId,
      date,
      time,
      status: "taken",
      amount: med.dose,
      at: Date.now(),
    });
    await db.medicines.update(medId, { stock: Math.max(0, round(med.stock - med.dose)) });
  });
}

export async function skipDose(medId: string, date: string, time: string) {
  await db.transaction("rw", db.medicines, db.intakes, async () => {
    const id = doseKey(medId, date, time);
    const prev = await db.intakes.get(id);
    if (prev?.status === "taken") {
      const med = await db.medicines.get(medId);
      if (med) await db.medicines.update(medId, { stock: round(med.stock + prev.amount) });
    }
    await db.intakes.put({
      id,
      medicineId: medId,
      date,
      time,
      status: "skipped",
      amount: 0,
      at: Date.now(),
    });
  });
}

/** Zruší užitie alebo preskočenie a vráti kusy do zásoby. */
export async function undoDose(medId: string, date: string, time: string) {
  await db.transaction("rw", db.medicines, db.intakes, async () => {
    const id = doseKey(medId, date, time);
    const prev = await db.intakes.get(id);
    if (!prev) return;
    if (prev.status === "taken") {
      const med = await db.medicines.get(medId);
      if (med) await db.medicines.update(medId, { stock: round(med.stock + prev.amount) });
    }
    await db.intakes.delete(id);
  });
}

/** Liek podľa potreby: zapíše užitie teraz. */
export async function takeNow(medId: string) {
  await db.transaction("rw", db.medicines, db.intakes, async () => {
    const med = await db.medicines.get(medId);
    if (!med) return;
    await db.intakes.add({
      id: uid(),
      medicineId: medId,
      date: ymd(new Date()),
      time: null,
      status: "taken",
      amount: med.dose,
      at: Date.now(),
    });
    await db.medicines.update(medId, { stock: Math.max(0, round(med.stock - med.dose)) });
  });
}

export async function restock(medId: string) {
  await db.transaction("rw", db.medicines, async () => {
    const med = await db.medicines.get(medId);
    if (med) await db.medicines.update(medId, { stock: round(med.stock + med.packSize) });
  });
}

export async function deleteMedicine(id: string) {
  await db.transaction("rw", db.medicines, db.intakes, async () => {
    await db.intakes.where("medicineId").equals(id).delete();
    await db.medicines.delete(id);
  });
}

export async function deleteMember(id: string) {
  await db.transaction("rw", db.members, db.medicines, db.intakes, async () => {
    const meds = await db.medicines.where("memberId").equals(id).primaryKeys();
    for (const medId of meds) {
      await db.intakes.where("medicineId").equals(medId).delete();
    }
    await db.medicines.where("memberId").equals(id).delete();
    await db.members.delete(id);
  });
}

/* ---------- Záloha ---------- */

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(url: string): Blob {
  const [head, body] = url.split(",");
  const mime = /data:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function exportBackup(): Promise<string> {
  const [members, medicines, intakes] = await Promise.all([
    db.members.toArray(),
    db.medicines.toArray(),
    db.intakes.toArray(),
  ]);
  const meds = await Promise.all(
    medicines.map(async ({ photo, ...rest }) => ({
      ...rest,
      photo: photo ? await blobToDataUrl(photo) : undefined,
    })),
  );
  return JSON.stringify({
    app: "liekobudik",
    version: 1,
    exportedAt: new Date().toISOString(),
    members,
    medicines: meds,
    intakes,
  });
}

/** Nahradí všetky údaje v zariadení obsahom zálohy. */
export async function importBackup(json: string) {
  const data = JSON.parse(json);
  if (data?.app !== "liekobudik" || !Array.isArray(data.members) || !Array.isArray(data.medicines)) {
    throw new Error("Toto nie je záloha z Liekobudíka.");
  }
  const medicines: Medicine[] = data.medicines.map(
    (m: Omit<Medicine, "photo"> & { photo?: string }) => ({
      ...m,
      photo: typeof m.photo === "string" ? dataUrlToBlob(m.photo) : undefined,
    }),
  );
  await db.transaction("rw", db.members, db.medicines, db.intakes, async () => {
    await Promise.all([db.members.clear(), db.medicines.clear(), db.intakes.clear()]);
    await db.members.bulkPut(data.members);
    await db.medicines.bulkPut(medicines);
    await db.intakes.bulkPut(Array.isArray(data.intakes) ? data.intakes : []);
  });
}

export async function wipeAll() {
  await db.transaction("rw", db.members, db.medicines, db.intakes, async () => {
    await Promise.all([db.members.clear(), db.medicines.clear(), db.intakes.clear()]);
  });
}
