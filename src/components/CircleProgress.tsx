import { PACKS } from "@/lib/packs";
import { themeStatus, themesDone, type Answers } from "@/lib/readiness";

// One circle, 8 arcs (one per theme). Counts only, never percentages.
const R = 44;
const C = 2 * Math.PI * R;
const GAP = 4;
const SEG = C / 8 - GAP;

export function CircleProgress({ profile, size = 160 }: { profile: Answers; size?: number }) {
  const done = themesDone(profile);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`Your circle: ${done} of 8 themes filled`} className="circle-progress shrink-0">
      {PACKS.map((t, i) => {
        const s = themeStatus(profile, t.id);
        const cls = s === "done" ? "stroke-clay" : s === "started" ? "stroke-clay" : "stroke-sand";
        return (
          <circle
            key={t.id}
            cx="50"
            cy="50"
            r={R}
            fill="none"
            strokeWidth={s === "done" ? 9 : s === "started" ? 2.5 : 6}
            strokeDasharray={`${SEG} ${C - SEG}`}
            strokeDashoffset={-(i * (C / 8)) + C / 4 - GAP / 2}
            className={`${cls} ${s === "done" ? "circle-seg-done" : ""}`}
            data-status={s}
          />
        );
      })}
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="font-display fill-ink" style={{ fontSize: profile.n.length > 9 ? 11 : 15, fontWeight: 500 }}>
        {profile.n.trim() || "You"}
      </text>
    </svg>
  );
}
