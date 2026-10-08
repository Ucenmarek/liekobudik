import { parseYmd } from "@/lib/dates";
import { WEEKDAY_SHORT, average } from "@/lib/readings";
import type { Reading } from "@/lib/types";

const W = 322;
const H = 150;
const LEFT = 34;
const RIGHT = 316;
const TOP = 14;
const BOTTOM = 112;

/** Graf horného a dolného tlaku po dňoch (denný priemer). */
export function BpChart({ days, readings }: { days: string[]; readings: Reading[] }) {
  const points = days.map((date) => average(readings.filter((r) => r.date === date)));
  const values = points.flatMap((p) => (p ? [p.sys, p.dia] : []));
  if (values.length === 0) {
    return (
      <div className="muted" style={{ fontSize: 14, padding: "18px 0" }}>
        Za toto obdobie zatiaľ nie je žiadne meranie.
      </div>
    );
  }
  const lo = Math.floor((Math.min(...values) - 8) / 10) * 10;
  const hi = Math.ceil((Math.max(...values) + 8) / 10) * 10;
  const x = (i: number) => (days.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + 6 + (i * (RIGHT - LEFT - 6)) / (days.length - 1));
  const y = (v: number) => BOTTOM - ((v - lo) / (hi - lo)) * (BOTTOM - TOP);
  const ticks = [hi, Math.round((hi + lo) / 2), lo];
  const line = (key: "sys" | "dia") =>
    points
      .map((p, i) => (p ? `${x(i).toFixed(1)},${y(p[key]).toFixed(1)}` : null))
      .filter(Boolean)
      .join(" ");
  const step = days.length > 10 ? Math.ceil(days.length / 6) : 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Graf horného a dolného tlaku za posledných ${days.length} dní`}>
      <g stroke="#e2eae7" strokeWidth="1">
        {ticks.map((t) => (
          <path key={t} d={`M${LEFT - 4} ${y(t)}H${RIGHT + 2}`} />
        ))}
      </g>
      <g fontSize="11" fill="#4a5568" textAnchor="end">
        {ticks.map((t) => (
          <text key={t} x={LEFT - 8} y={y(t) + 4}>{t}</text>
        ))}
      </g>
      <polyline fill="none" stroke="#c2304a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={line("sys")} />
      <polyline fill="none" stroke="#0b7f88" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={line("dia")} />
      {points.map((p, i) =>
        p ? (
          <g key={days[i]}>
            <circle cx={x(i)} cy={y(p.sys)} r="3.5" fill="#c2304a" />
            <circle cx={x(i)} cy={y(p.dia)} r="3.5" fill="#0b7f88" />
          </g>
        ) : null,
      )}
      <g fontSize="11" fill="#4a5568" textAnchor="middle">
        {days.map((d, i) =>
          (days.length - 1 - i) % step === 0 ? (
            <text key={d} x={i === days.length - 1 && days.length > 10 ? RIGHT + 4 : x(i)} y={H - 8} textAnchor={i === days.length - 1 && days.length > 10 ? "end" : "middle"}>
              {days.length <= 10 ? WEEKDAY_SHORT[parseYmd(d).getDay()] : `${parseYmd(d).getDate()}. ${parseYmd(d).getMonth() + 1}.`}
            </text>
          ) : null,
        )}
      </g>
    </svg>
  );
}

export function BpLegend() {
  return (
    <div className="muted" style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 600 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 14, height: 3, borderRadius: 2, background: "#c2304a" }} />
        horný
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ width: 14, height: 3, borderRadius: 2, background: "#0b7f88" }} />
        dolný
      </span>
    </div>
  );
}
