import type { ReactNode, SVGProps } from "react";
import type { DayPart } from "@/lib/schedule";

type P = { size?: number; sw?: number } & SVGProps<SVGSVGElement>;

function Svg({ size = 22, sw = 2, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconBack = (p: P) => (
  <Svg sw={2.2} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg sw={2.6} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg sw={3} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg sw={3} {...p}>
    <path d="M7 12h10" />
  </Svg>
);
export const IconSettings = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4" />
  </Svg>
);
export const IconWarn = (p: P) => (
  <Svg {...p}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Svg>
);
export const IconSunrise = (p: P) => (
  <Svg {...p}>
    <path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 6v3M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8" />
  </Svg>
);
export const IconSun = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
);
export const IconMoon = (p: P) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 1.5" />
  </Svg>
);
export const IconAlarm = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 1.5M5 3 2.5 5.5M19 3l2.5 2.5" />
  </Svg>
);
export const IconPill = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7zM7 10l7 7" />
  </Svg>
);
export const IconToday = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M8 2v3M16 2v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM9 14.5l2 2 4-4" />
  </Svg>
);
export const IconPulse = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />
  </Svg>
);
export const IconPerson = (p: P) => (
  <Svg sw={1.8} {...p}>
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />
  </Svg>
);
export const IconPeople = (p: P) => (
  <Svg {...p}>
    <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
  </Svg>
);
export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9zM10 20a2 2 0 0 0 4 0" />
  </Svg>
);
export const IconHeart = (p: P) => (
  <Svg {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Svg>
);
export const IconLock = (p: P) => (
  <Svg {...p}>
    <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
  </Svg>
);
export const IconCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const IconEdit = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" />
  </Svg>
);
export const IconReport = (p: P) => (
  <Svg {...p}>
    <path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" />
  </Svg>
);
export const IconPhone = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
  </Svg>
);
export const IconShield = (p: P) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.500-7-10V6zM9 12l2 2 4-4" />
  </Svg>
);
export const IconCard = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM7 10h4M7 14h7M16 10h1" />
  </Svg>
);
export const IconChevron = (p: P) => (
  <Svg sw={2.2} {...p}>
    <path d="M9 5l7 7-7 7" />
  </Svg>
);

export function DayPartIcon({ part, ...p }: P & { part: DayPart | "morning" | "evening" }) {
  if (part === "morning") return <IconSunrise {...p} />;
  if (part === "noon") return <IconSun {...p} />;
  return <IconMoon {...p} />;
}

/** Ikona appky: budík s dvoma tabletkami. */
export function AppIcon({ size = 124 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Liekobudík: budík s dvoma tabletkami"
      style={{ flexShrink: 0 }}
    >
      <rect width="512" height="512" rx="112" fill="#0a57c9" />
      <circle cx="150" cy="142" r="64" fill="#f5b83d" />
      <circle cx="362" cy="142" r="64" fill="#f5b83d" />
      <rect x="234" y="62" width="44" height="44" rx="14" fill="#f5b83d" />
      <path d="M172 404l-30 40M340 404l30 40" stroke="#f5b83d" strokeWidth="26" strokeLinecap="round" />
      <circle cx="256" cy="270" r="172" fill="#ffffff" />
      <circle cx="256" cy="270" r="140" fill="none" stroke="#d6e4fb" strokeWidth="10" />
      <path d="M256 150v22M376 270h-22M256 390v-22M136 270h22" stroke="#083c8f" strokeWidth="12" strokeLinecap="round" />
      <path
        d="M256 270l-54-40M256 270l72-66"
        stroke="#083c8f"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="256" cy="270" r="18" fill="#f08a00" />
      <g transform="rotate(-40 362 394)">
        <rect x="252" y="352" width="220" height="84" rx="42" fill="#ffffff" stroke="#083c8f" strokeWidth="12" />
        <path d="M362 352h68a42 42 0 0 1 0 84h-68z" fill="#3aa845" stroke="#083c8f" strokeWidth="12" strokeLinejoin="round" />
      </g>
      <circle cx="418" cy="432" r="48" fill="#ffffff" stroke="#083c8f" strokeWidth="12" />
      <path d="M396 454l44-44" stroke="#b3c8ee" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}
