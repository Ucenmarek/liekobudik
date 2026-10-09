"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useObjectUrl } from "@/lib/hooks";
import type { Member } from "@/lib/types";
import { IconCard, IconPeople, IconPerson, IconPill, IconPulse, IconToday } from "./Icons";

export function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: member?.color ?? "#1d2b45",
        fontSize: Math.round(size * 0.44),
      }}
      aria-hidden="true"
    >
      {member?.name.trim().charAt(0) || "?"}
    </span>
  );
}

/** Výber člena rodiny nad zoznamom. Pri jednom členovi sa nezobrazuje. */
export function MemberFilter({
  members,
  value,
  onChange,
  all = true,
}: {
  members: Member[];
  value: string;
  onChange: (id: string) => void;
  /** Ponúknuť aj možnosť „Všetci“ */
  all?: boolean;
}) {
  if (members.length < 2) return null;
  return (
    <div className="members" role="group" aria-label="Člen rodiny">
      {all && <button
        type="button"
        aria-pressed={value === "all"}
        onClick={() => onChange("all")}
        style={{ ["--ring" as string]: "#1d2b45" }}
      >
        <span className="avatar" style={{ width: 40, height: 40, background: "#1d2b45" }}>
          <IconPeople />
        </span>
        <span>Všetci</span>
      </button>}
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={value === m.id}
          onClick={() => onChange(m.id)}
          style={{ ["--ring" as string]: m.color }}
        >
          <Avatar member={m} />
          <span>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

export function MedPhoto({
  blob,
  size,
  radius = 12,
}: {
  blob?: Blob | null;
  size: number;
  radius?: number;
}) {
  const url = useObjectUrl(blob);
  const style = { width: size, height: size, borderRadius: radius };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="photo" src={url} alt="" style={style} />;
  }
  return (
    <span className="photo" style={style}>
      <IconPill size={Math.round(size * 0.46)} />
    </span>
  );
}

const TABS = [
  { href: "/", label: "Dnes", Icon: IconToday },
  { href: "/lieky", label: "Lieky", Icon: IconPill },
  { href: "/merania", label: "Merania", Icon: IconPulse },
  { href: "/lekari", label: "Lekári", Icon: IconPerson },
  { href: "/karta", label: "Karta", Icon: IconCard },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Hlavná navigácia">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}>
            <Icon size={24} sw={active ? 2.2 : 1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
