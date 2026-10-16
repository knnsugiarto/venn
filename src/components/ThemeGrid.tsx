import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronRight, Clapperboard, Music, Plane, Scale, Sun, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { PACKS, type PackId } from "@/lib/packs";
import { type Answers } from "@/lib/readiness";

export const THEME_ICONS: Record<PackId, LucideIcon> = { fo: UtensilsCrossed, ln: TrainFront, ms: Music, st: BookOpen, wk: Sun, sc: Clapperboard, tp: Scale, tv: Plane };

export function ThemeGrid({ profile, title, subtitle }: { profile: Answers; title: string; subtitle?: string }) {
  return (
    <section id="themes" className="mt-10 scroll-mt-6 border-t border-sand pt-8 text-left">
      <h2 className="text-2xl font-medium">{title}</h2>
      {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
      <ul className="mt-5 divide-y divide-sand">
        {PACKS.map((t) => {
          const count = (profile.taps?.[t.id]?.filter(x => x !== null).length ?? 0) + t.prompts.filter(id => profile.typed[id]?.text.trim()).length;
          return <li key={t.id}>
            <Link to="/themes/$id" params={{ id: t.id }} className="flex min-h-16 items-center gap-3 py-3 focus-visible:outline-2">
              <span className="flex-1 font-medium">{t.name}</span>
              <span className="text-sm text-ink-soft">{count} of {t.questions.length + t.prompts.length}</span>
              <ChevronRight size={18} className="text-ink-soft" aria-hidden="true" />
            </Link>
          </li>;
        })}
      </ul>
    </section>
  );
}
