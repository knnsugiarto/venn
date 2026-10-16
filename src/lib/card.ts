import { z } from "zod";
import { PROMPT_IDS, type PromptId } from "./prompts";
import { cleanPacks, getPack, isPackId, type PackAnswers, type PackId, type Packs } from "./packs";

export const CARD_TTL_SECONDS = 48 * 3600;
// One extra hour of slack for clock drift between phones — but no more, so
// nobody can mint a card that never expires.
const MAX_AHEAD_SECONDS = 49 * 3600;

// Control characters could hide text or break the prompt; remove before checks.
// eslint-disable-next-line no-control-regex
const stripControl = (s: string) => s.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
const clean = z.string().transform(stripControl);

// Pack answers: known pack, exactly 5 entries, each null (skipped) or a real option.
export const PacksSchema = z
  .record(z.string(), z.array(z.number().int().min(0).nullable()).length(5))
  .superRefine((p, ctx) => {
    for (const [id, ans] of Object.entries(p)) {
      if (!isPackId(id)) return ctx.addIssue({ code: "custom", message: `Unknown pack ${id}` });
      const pack = getPack(id);
      if (ans.some((v, i) => v !== null && v >= (pack.questions[i]?.options.length ?? 0)))
        return ctx.addIssue({ code: "custom", message: `Unknown option in ${id}` });
    }
  })
  .transform((p) => cleanPacks(p as Packs));

export const CardSchema = z
  .object({
    v: z.literal(1),
    id: z.string().regex(/^[a-z0-9]{8}$/),
    n: clean.pipe(z.string().min(1, "Add your first name").max(20).regex(/^[\p{L}\p{M}' .-]+$/u, "Names can only use letters, spaces, hyphens and apostrophes")),
    c: clean.pipe(z.string().max(40)),
    e: z.number().int(),
    a: z
      .array(z.tuple([z.enum(PROMPT_IDS), clean.pipe(z.string().min(1).max(60))]))
      .min(1)
      .max(6)
      .refine((a) => new Set(a.map(([id]) => id)).size === a.length, "Each prompt can only be used once"),
    p: PacksSchema.optional(),
  })
  .refine((c) => c.e <= nowSeconds() + MAX_AHEAD_SECONDS, "Card expiry is too far ahead");

export type Card = z.infer<typeof CardSchema>;

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function isExpired(card: Pick<Card, "e">, now = nowSeconds()) {
  return card.e <= now;
}

export function hoursLeft(card: Pick<Card, "e">, now = nowSeconds()) {
  return Math.max(0, Math.ceil((card.e - now) / 3600));
}

export function randomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function createCard(input: { id?: string | undefined; n: string; c: string; a: [PromptId, string][]; p?: Packs | undefined }): Card {
  const card: Card = { v: 1, id: input.id ?? randomId(), n: input.n.trim(), c: input.c.trim(), e: nowSeconds() + CARD_TTL_SECONDS, a: input.a.map(([p, t]) => [p, t.trim()]) };
  const p = cleanPacks(input.p);
  if (p) card.p = p;
  return card;
}

export function refreshCard(card: Card): Card {
  return { ...card, e: nowSeconds() + CARD_TTL_SECONDS };
}

/** Sets one pack's answers (all-skipped removes it) and refreshes the 48h expiry. */
export function withPack(card: Card, id: PackId, answers: PackAnswers | null): Card {
  const next: Packs = { ...card.p };
  if (answers) next[id] = answers;
  else delete next[id];
  const p = cleanPacks(next);
  const { p: _old, ...rest } = card;
  return refreshCard(p ? { ...rest, p } : rest);
}
