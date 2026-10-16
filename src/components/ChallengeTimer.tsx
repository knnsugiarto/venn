import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

const TOTAL = 120;

export function ChallengeTimer() {
  const [left, setLeft] = useState(TOTAL);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (left === 0 && running) {
      setRunning(false);
      try {
        navigator.vibrate?.(200);
      } catch {
        /* not supported */
      }
    }
  }, [left, running]);

  const r = 26;
  const c = 2 * Math.PI * r;
  const done = left === 0;
  const label = done ? "Time!" : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3">
      <div className={`relative h-16 w-16 ${done ? "anim-pulse" : ""}`} aria-live="polite">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden="true">
          <circle cx="32" cy="32" r={r} fill="none" className="stroke-sand" strokeWidth="5" />
          <circle cx="32" cy="32" r={r} fill="none" className="stroke-clay transition-[stroke-dashoffset] duration-1000 ease-linear" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - left / TOTAL)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{label}</span>
      </div>
      {!done && (
        <button type="button" className="btn-secondary" onClick={() => setRunning(!running)}>
          {running ? <Pause size={18} strokeWidth={1.75} /> : <Play size={18} strokeWidth={1.75} />}
          {running ? "Pause" : left === TOTAL ? "Start" : "Resume"}
        </button>
      )}
      {left !== TOTAL && (
        <button type="button" className="btn-quiet" onClick={() => { setRunning(false); setLeft(TOTAL); }}>
          <RotateCcw size={18} strokeWidth={1.75} /> Reset
        </button>
      )}
    </div>
  );
}
