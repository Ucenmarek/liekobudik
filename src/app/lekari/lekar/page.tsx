"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack, IconCheck } from "@/components/Icons";
import { db, uid } from "@/lib/db";
import type { Doctor } from "@/lib/types";
import { parseMapShare } from "@/lib/visits";

const blank: Doctor = { id: "", name: "", specialty: "", clinic: "", address: "", mapLink: "", phone: "", hours: "", note: "" };

export default function LekarPage() {
  const router = useRouter();
  const id = useSearchParams().get("id");
  const [f, setF] = useState<Doctor | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (f) return;
    if (!id) {
      setF(blank);
      return;
    }
    db.doctors.get(id).then((d) => {
      if (d) setF({ ...blank, ...d });
      else router.replace("/lekari");
    });
  }, [f, id, router]);

  if (!f) return <div className="screen" />;

  const set = (patch: Partial<Doctor>) => {
    setError("");
    setF({ ...f, ...patch });
  };
  const text = (key: keyof Doctor, label: string, placeholder = "", type = "text") => (
    <div className="stack">
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} className="field" type={type} inputMode={type === "tel" ? "tel" : undefined} autoComplete="off" placeholder={placeholder} value={f[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} />
    </div>
  );

  /** Vloží odkaz z mapy; zo zdieľaného textu vyberie odkaz a doplní názov ambulancie, ak chýba. */
  function applyMapText(text: string): boolean {
    if (!f) return false;
    const parsed = parseMapShare(text);
    if (!parsed) return false;
    set({ mapLink: parsed.link, clinic: f.clinic?.trim() ? f.clinic : parsed.label || f.clinic });
    return true;
  }

  async function pasteMapLink() {
    try {
      const text = await navigator.clipboard.readText();
      if (!applyMapText(text)) setError("V schránke nie je odkaz. Skopírujte ho v mapách cez Zdieľať.");
    } catch {
      setError("Schránku sa nepodarilo prečítať. Odkaz vložte do poľa ručne.");
    }
  }

  async function save() {
    if (!f) return;
    if (!f.name.trim() && !f.specialty.trim()) {
      setError("Napíšte meno lekára alebo odbornosť.");
      return;
    }
    const link = f.mapLink?.trim();
    if (link && !parseMapShare(link)) {
      setError("Odkaz na mapu má začínať https://");
      return;
    }
    const clean = (s?: string) => s?.trim() || undefined;
    await db.doctors.put({
      id: f.id || uid(),
      name: f.name.trim(),
      specialty: f.specialty.trim(),
      clinic: clean(f.clinic),
      address: clean(f.address),
      mapLink: link ? parseMapShare(link)!.link : undefined,
      phone: clean(f.phone),
      hours: clean(f.hours),
      note: clean(f.note),
    });
    router.replace("/lekari");
  }

  async function remove() {
    if (!f?.id) return;
    await db.doctors.delete(f.id);
    router.replace("/lekari");
  }

  return (
    <main className="screen" style={{ gap: 12, paddingTop: 22 }}>
      <div className="row">
        <Link href="/lekari" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small grow">{f.id ? "Upraviť kontakt" : "Nový lekár"}</h1>
      </div>

      {text("specialty", "Odbornosť", "napr. Všeobecný lekár, Zubár")}
      {text("name", "Meno lekára", "napr. MUDr. Nováková")}
      {text("clinic", "Ambulancia alebo zariadenie (nepovinné)")}
      {text("phone", "Telefón (nepovinné)", "", "tel")}
      {text("address", "Adresa (nepovinné)", "ulica, mesto")}

      <div className="stack">
        <label className="label" htmlFor="mapa">Odkaz z Google Máp (nepovinné)</label>
        <div className="row">
          <input
            id="mapa"
            className="field"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://maps.app.goo.gl/…"
            value={f.mapLink ?? ""}
            onChange={(e) => set({ mapLink: e.target.value })}
            onPaste={(e) => {
              if (applyMapText(e.clipboardData.getData("text"))) e.preventDefault();
            }}
          />
          <button type="button" className="btn soft" onClick={pasteMapLink}>Vložiť</button>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          V Google Mapách otvorte ambulanciu, ťuknite na Zdieľať a skopírujte odkaz. Tlačidlo Mapa potom otvorí presne toto miesto.
        </div>
      </div>
      {text("hours", "Ordinačné hodiny (nepovinné)", "napr. Po–Pi 7:00–13:00")}
      {text("note", "Poznámka (nepovinné)", "napr. objednať sa telefonicky")}

      {error && <div className="error" role="alert">{error}</div>}
      <div className="grow" />

      <button type="button" className="btn big green" onClick={save}>
        <IconCheck size={22} />
        Uložiť kontakt
      </button>

      {f.id &&
        (confirmDelete ? (
          <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div>Odstrániť tento kontakt? Zapísané návštevy ostanú.</div>
            <div className="grid2">
              <button type="button" className="btn outline" onClick={() => setConfirmDelete(false)}>Ponechať</button>
              <button type="button" className="btn danger" onClick={remove}>Odstrániť</button>
            </div>
          </div>
        ) : (
          <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
            Odstrániť kontakt
          </button>
        ))}
    </main>
  );
}
