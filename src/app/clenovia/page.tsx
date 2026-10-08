"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { IconBack, IconBell, IconEdit, IconPlus } from "@/components/Icons";
import { Avatar } from "@/components/ui";
import { db, deleteMember, uid } from "@/lib/db";
import { MEMBER_COLORS, type Member } from "@/lib/types";

interface Draft {
  id?: string;
  name: string;
  note: string;
  color: string;
}

export default function ClenoviaPage() {
  const onboarding = useSearchParams().get("onboarding") === "1";
  const data = useLiveQuery(async () => {
    const [members, medicines] = await Promise.all([
      db.members.orderBy("order").toArray(),
      db.medicines.toArray(),
    ]);
    return { members, medicines };
  }, []);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!data) return <div className="screen" />;
  const { members, medicines } = data;
  const second = members[1];

  function open(m?: Member) {
    setError("");
    setConfirmDelete(false);
    setDraft(
      m
        ? { id: m.id, name: m.name, note: m.note ?? "", color: m.color }
        : {
            name: "",
            note: "",
            color: MEMBER_COLORS.find((c) => !members.some((x) => x.color === c)) ?? MEMBER_COLORS[0],
          },
    );
  }

  async function save() {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Napíšte meno.");
      return;
    }
    if (draft.id) {
      await db.members.update(draft.id, { name, note: draft.note.trim(), color: draft.color });
    } else {
      const order = members.reduce((max, m) => Math.max(max, m.order), -1) + 1;
      await db.members.add({ id: uid(), name, note: draft.note.trim(), color: draft.color, order });
    }
    setDraft(null);
  }

  async function remove() {
    if (!draft?.id) return;
    await deleteMember(draft.id);
    setDraft(null);
  }

  const editor = draft && (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12, padding: 14, border: "2px solid var(--blue)" }}>
      <div className="stack">
        <label className="label" htmlFor="meno">Meno</label>
        <input id="meno" className="field" type="text" autoComplete="off" autoFocus placeholder="napr. Stará mama" value={draft.name} onChange={(e) => { setError(""); setDraft({ ...draft, name: e.target.value }); }} />
      </div>
      <div className="stack">
        <label className="label" htmlFor="pozn">Poznámka (nepovinné)</label>
        <input id="pozn" className="field" type="text" autoComplete="off" placeholder="napr. lieky podávam ja" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      </div>
      <div className="stack">
        <div className="label">Farba</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "6px 6px" }}>
          {MEMBER_COLORS.map((c, i) => (
            <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Farba ${i + 1}`} aria-pressed={draft.color === c} onClick={() => setDraft({ ...draft, color: c })} />
          ))}
        </div>
      </div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="grid2">
        <button type="button" className="btn outline" onClick={() => setDraft(null)}>Zrušiť</button>
        <button type="button" className="btn" onClick={save}>Uložiť</button>
      </div>
      {draft.id && members.length > 1 &&
        (confirmDelete ? (
          <div className="note red" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div>
              Odstrániť člena {draft.name}
              {medicines.some((m) => m.memberId === draft.id) ? " aj so všetkými jeho liekmi" : ""}? Nedá sa to vrátiť.
            </div>
            <div className="grid2">
              <button type="button" className="btn outline" onClick={() => setConfirmDelete(false)}>Ponechať</button>
              <button type="button" className="btn danger" onClick={remove}>Odstrániť</button>
            </div>
          </div>
        ) : (
          <button type="button" className="link-btn" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
            Odstrániť člena
          </button>
        ))}
    </div>
  );

  return (
    <main className="screen" style={{ gap: 12 }}>
      <div className="between">
        <Link href={onboarding ? "/uvod" : "/nastavenia"} className="icon-btn" aria-label="Späť">
          <IconBack />
        </Link>
        {onboarding && <div className="label">Krok 1 z 3</div>}
      </div>

      <div>
        <h1 className="h1" style={{ fontSize: 30, marginTop: 4 }}>{onboarding ? "Pre koho to bude?" : "Členovia rodiny"}</h1>
        <p className="muted" style={{ marginTop: 6, fontSize: 16 }}>Pridajte seba aj blízkych, o ktorých lieky sa staráte.</p>
      </div>

      {members.map((m) =>
        draft?.id === m.id ? (
          <div key={m.id}>{editor}</div>
        ) : (
          <div key={m.id} className="card row" style={{ gap: 14 }}>
            <Avatar member={m} size={50} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{m.name}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {m.note || (() => {
                  const n = medicines.filter((x) => x.memberId === m.id).length;
                  return n === 0 ? "Zatiaľ bez liekov" : n === 1 ? "1 liek" : n < 5 ? `${n} lieky` : `${n} liekov`;
                })()}
              </div>
            </div>
            <button type="button" className="icon-btn" style={{ border: 0, background: "transparent", color: "var(--muted)" }} aria-label={`Upraviť člena ${m.name}`} onClick={() => open(m)}>
              <IconEdit size={20} />
            </button>
          </div>
        ),
      )}

      {draft && !draft.id ? (
        editor
      ) : (
        <button type="button" className="dashed" onClick={() => open()}>
          <IconPlus size={20} />
          Pridať člena rodiny
        </button>
      )}

      <div className="note yellow" style={{ borderRadius: 18 }}>
        <IconBell size={24} />
        <div>
          Pripomienky pre všetkých prídu na tento telefón, vždy s menom
          {second ? <>: <strong>„{second.name}: názov lieku“</strong>.</> : "."}
        </div>
      </div>

      <div className="grow" />

      {onboarding ? (
        <Link href="/lieky/liek?onboarding=1" className="btn big">Pokračovať</Link>
      ) : (
        <Link href="/" className="btn big">Hotovo</Link>
      )}
    </main>
  );
}
