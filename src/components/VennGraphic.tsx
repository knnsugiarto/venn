type Props = {
  state: "idle" | "matching" | "result";
  left?: string;
  right?: string;
  contrast?: boolean;
};

const trunc = (s: string) => (s.length > 9 ? s.slice(0, 8) + "…" : s);

export function VennGraphic({ state, left, right, contrast }: Props) {
  const lc = state === "idle" ? "anim-drift-l" : state === "matching" ? "anim-slide-l" : "";
  const rc = state === "idle" ? "anim-drift-r" : state === "matching" ? "anim-slide-r" : "";
  const label = left && right ? `Venn diagram of ${left} and ${right}` : "Two overlapping circles";
  return (
    <div className="relative mx-auto w-full max-w-xs">
      <svg viewBox="0 0 320 200" role="img" aria-label={label} className="w-full overflow-visible">
        {state === "result" && (
          <path
            d="M160 23.79 A88 88 0 0 1 160 176.21 A88 88 0 0 1 160 23.79 Z"
            className={`anim-lens ${contrast ? "fill-clay-pale stroke-clay" : "fill-clay"}`}
            strokeWidth={contrast ? 3 : 0}
            strokeDasharray={contrast ? "6 6" : undefined}
          />
        )}
        {state === "idle" && <path d="M160 23.79 A88 88 0 0 1 160 176.21 A88 88 0 0 1 160 23.79 Z" className="fill-clay" />}
        {state === "matching" && <path d="M160 23.79 A88 88 0 0 1 160 176.21 A88 88 0 0 1 160 23.79 Z" className="fill-clay-pale anim-breathe" />}
        <g className={lc}>
          <circle cx="116" cy="100" r="88" fill="none" className="stroke-ink" strokeWidth="3" />
          {left && <text x="72" y="105" textAnchor="middle" className="fill-ink" style={{ font: "600 15px Inter, sans-serif" }}>{trunc(left)}</text>}
        </g>
        <g className={rc}>
          <circle cx="204" cy="100" r="88" fill="none" className="stroke-ink" strokeWidth="3" />
          {right && <text x="248" y="105" textAnchor="middle" className="fill-ink" style={{ font: "600 15px Inter, sans-serif" }}>{trunc(right)}</text>}
        </g>
      </svg>
      {state === "result" && <Burst />}
    </div>
  );
}

export function Burst() {
  const dots = [0, 60, 120, 180, 240, 300];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2">
      {dots.map((deg) => {
        const r = (deg * Math.PI) / 180;
        return (
          <span
            key={deg}
            className="anim-burst absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-clay"
            style={{ ["--dx" as string]: `${Math.cos(r) * 70}px`, ["--dy" as string]: `${Math.sin(r) * 70}px` }}
          />
        );
      })}
    </div>
  );
}
