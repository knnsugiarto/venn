import type { PromptId } from "./prompts";
import type { Card } from "./card";
import { PACKS, type PackId, type Packs } from "./packs";

// Pure readiness rules (docs/ADDON-your-circle.md 3.3). Shaped loosely so the
// server can check a card with the same functions it uses for a profile.
export type Answers = {
  n: string;
  typed: Partial<Record<PromptId, { text: string } | undefined>>;
  taps: Packs | undefined;
};

export type Mode = "quickStart" | "topUp" | "ready";

export function typedCount(p: Answers): number {
  return Object.values(p.typed).filter((x) => !!x && x.text.trim() !== "").length;
}

export function tapCount(p: Answers): number {
  return Object.values(p.taps ?? {}).reduce((n, a) => n + (a?.filter((x) => x !== null).length ?? 0), 0);
}

export function total(p: Answers): number {
  return typedCount(p) + tapCount(p);
}

/** 1 typed answer so the main link can quote something written; 5 in total so a
 * ready circle carries about as much as the old 5-answer card. */
export function isReady(p: Answers): boolean {
  return p.n.trim() !== "" && typedCount(p) >= 1 && total(p) >= 5;
}

export function missingFor(p: Answers): number {
  return isReady(p) ? 0 : Math.max(5 - total(p), typedCount(p) === 0 ? 1 : 0);
}

export function mode(p: Answers): Mode {
  return total(p) === 0 ? "quickStart" : isReady(p) ? "ready" : "topUp";
}

export type ThemeStatus = "done" | "started" | "none";

/** Done = at least 3 taps and at least 1 typed prompt answered in that theme. */
export function themeStatus(p: Answers, id: PackId): ThemeStatus {
  const theme = PACKS.find((t) => t.id === id)!;
  const taps = p.taps?.[id]?.filter((x) => x !== null).length ?? 0;
  const typed = theme.prompts.filter((pid) => p.typed[pid]?.text.trim()).length;
  if (taps >= 3 && typed >= 1) return "done";
  return taps + typed > 0 ? "started" : "none";
}

export function themesDone(p: Answers): number {
  return PACKS.filter((t) => themeStatus(p, t.id) === "done").length;
}

/** Server check: a card must carry a ready circle (same thresholds). */
export function cardIsReady(card: Card): boolean {
  const typed: Answers["typed"] = {};
  for (const [id, text] of card.a) typed[id] = { text };
  return isReady({ n: card.n, typed, taps: card.p });
}
