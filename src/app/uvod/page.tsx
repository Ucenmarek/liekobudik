"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppIcon, IconBell, IconHeart, IconLock, IconPill } from "@/components/Icons";
import { db, importBackup, uid } from "@/lib/db";
import { MEMBER_COLORS } from "@/lib/types";

const POINTS = [
  { Icon: IconBell, bg: "#ffecb3", fg: "#7a5200", title: "Pripomenie každú dávku", text: "Upozornenie príde presne vtedy, keď treba." },
  { Icon: IconPill, bg: "#fdf1dc", fg: "#8a4b00", title: "Stráži zásoby", text: "Dá vedieť skôr, než sa lieky minú." },
  { Icon: IconHeart, bg: "#fde0e5", fg: "#a3243b", title: "Tlak a lekári na jednom mieste", text: "Merania, návštevy, prehliadky a kontakty." },
];

export default function UvodPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function start() {
    if ((await db.members.count()) === 0) {
      await db.members.add({ id: uid(), name: "Ja", color: MEMBER_COLORS[0], order: 0 });
    }
    router.push("/clenovia?onboarding=1");
  }

  async function restore(file?: File) {
    if (!file) return;
    try {
      await importBackup(await file.text());
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Zálohu sa nepodarilo načítať.");
    }
  }

  return (
    <main className="screen" style={{ alignItems: "center", padding: "52px 24px 26px", gap: 0 }}>
      <AppIcon size={124} />
      <h1 style={{ marginTop: 18, fontSize: 50, fontWeight: 900, letterSpacing: -1.5, lineHeight: 1 }}>
        <span style={{ color: "#0a57c9" }}>lieko</span>
        <span style={{ color: "#2a8f3a" }}>budík</span>
      </h1>
      <p className="muted" style={{ marginTop: 8, fontSize: 19, fontWeight: 500 }}>Lieky v správny čas.</p>

      <div style={{ width: "100%", marginTop: 28, display: "flex", flexDirection: "column", gap: 10 }}>
        {POINTS.map(({ Icon, bg, fg, title, text }) => (
          <div key={title} className="card row" style={{ gap: 14 }}>
            <span style={{ width: 46, height: 46, borderRadius: 14, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={24} sw={2} />
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
              <div className="muted" style={{ fontSize: 14 }}>{text}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="note green" style={{ width: "100%", marginTop: 14, borderRadius: 18 }}>
        <IconLock size={26} />
        <div><strong>Bez registrácie.</strong> Vaše údaje ostávajú len v tomto telefóne.</div>
      </div>

      <div className="grow" style={{ minHeight: 20 }} />

      <button type="button" className="btn big" onClick={start}>Začať</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => restore(e.target.files?.[0])} />
      <button type="button" className="link-btn" style={{ textDecoration: "none", minHeight: 46 }} onClick={() => fileRef.current?.click()}>
        Mám zálohu z iného telefónu
      </button>
      {error && <div className="error" role="alert">{error}</div>}
      <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>Liekobudík nenahrádza pokyny vášho lekára.</p>
    </main>
  );
}
