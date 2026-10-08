"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { IconBack, IconBell, IconChevron, IconPeople } from "@/components/Icons";
import { ymd } from "@/lib/dates";
import { db, exportBackup, importBackup, wipeAll } from "@/lib/db";

export default function NastaveniaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const count = useLiveQuery(() => db.members.count(), []);
  const [perm, setPerm] = useState<string>(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [message, setMessage] = useState("");
  const [confirmWipe, setConfirmWipe] = useState(false);

  async function enable() {
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      setPerm("denied");
    }
  }

  async function download() {
    const blob = new Blob([await exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liekobudik-zaloha-${ymd(new Date())}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Záloha je stiahnutá. Obsahuje lieky, fotky, históriu užívania aj merania.");
  }

  async function restore(file?: File) {
    if (!file) return;
    try {
      await importBackup(await file.text());
      setMessage("Záloha je obnovená.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Zálohu sa nepodarilo načítať.");
    }
  }

  async function wipe() {
    await wipeAll();
    try {
      localStorage.clear();
    } catch {}
    router.replace("/uvod");
  }

  return (
    <main className="screen">
      <div className="row">
        <Link href="/" className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        <h1 className="h1 small">Nastavenia</h1>
      </div>

      <Link href="/clenovia" className="card row" style={{ textDecoration: "none", color: "inherit", minHeight: 64 }}>
        <IconPeople size={24} />
        <div className="grow">
          <div style={{ fontSize: 17, fontWeight: 700 }}>Členovia rodiny</div>
          <div className="muted" style={{ fontSize: 14 }}>
            {count === undefined ? "" : count === 1 ? "1 člen" : count < 5 ? `${count} členovia` : `${count} členov`}
          </div>
        </div>
        <IconChevron size={20} />
      </Link>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
        <div className="row">
          <IconBell size={24} />
          <div className="grow">
            <div style={{ fontSize: 17, fontWeight: 700 }}>Upozornenia</div>
            <div className="muted" style={{ fontSize: 14 }}>
              {perm === "granted" && "Povolené v tomto zariadení."}
              {perm === "default" && "Zatiaľ nepovolené."}
              {perm === "denied" && "Zablokované. Povoľte ich v nastaveniach prehliadača pre túto stránku."}
              {perm === "unsupported" && "Tento prehliadač upozornenia nepodporuje. Na iPhone najprv pridajte appku na plochu."}
            </div>
          </div>
          {perm === "default" && (
            <button type="button" className="btn" onClick={enable}>Povoliť</button>
          )}
        </div>
        <div className="muted" style={{ fontSize: 14 }}>
          V tejto verzii sa pripomienka zobrazí, keď je Liekobudík otvorený. Budík, ktorý zazvoní aj pri zavretej appke, príde v ďalšej etape.
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Záloha</div>
          <div className="muted" style={{ fontSize: 14 }}>
            Údaje sú len v tomto telefóne. Zálohu si uložte, keď meníte telefón alebo mažete údaje prehliadača.
          </div>
        </div>
        <div className="grid2">
          <button type="button" className="btn" onClick={download}>Stiahnuť zálohu</button>
          <button type="button" className="btn outline" onClick={() => fileRef.current?.click()}>Obnoviť zo zálohy</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
        <div className="muted" style={{ fontSize: 13 }}>Obnovenie nahradí všetky údaje v tomto zariadení obsahom zálohy.</div>
        {message && <div role="status" style={{ fontSize: 14, fontWeight: 700 }}>{message}</div>}
      </div>

      <div className="grow" />

      {confirmWipe ? (
        <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div>Vymazať všetkých členov, lieky, merania aj históriu z tohto zariadenia? Nedá sa to vrátiť.</div>
          <div className="grid2">
            <button type="button" className="btn outline" onClick={() => setConfirmWipe(false)}>Ponechať</button>
            <button type="button" className="btn danger" onClick={wipe}>Vymazať všetko</button>
          </div>
        </div>
      ) : (
        <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmWipe(true)}>
          Vymazať všetky údaje
        </button>
      )}
      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>Liekobudík nenahrádza pokyny vášho lekára.</p>
    </main>
  );
}
