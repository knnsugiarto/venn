import { z } from "zod";
import { CardSchema } from "./card";

export const RefSchema = z.object({ answer_id: z.string(), quote: z.string().describe("Hidden evidence for our checker: 1–6 words copied exactly from that answer. Never shown to users.") });
export type Ref = z.infer<typeof RefSchema>;

export const READING_KINDS = ["food", "drink", "person", "place", "screen", "book", "music", "game", "sport", "activity", "skill", "object", "idea", "other", "unknown"] as const;
const ReadingSchema = z.object({
  answer_id: z.string(),
  kind: z.preprocess((v) => typeof v === "string" ? v.toLowerCase() : v, z.enum(READING_KINDS)),
  gloss: z.string().describe("At most 10 words: what this is. Use 'not sure what this is' if unsure."),
});

// What we accept from the model before the guard. No length limits here: the
// guard enforces those, so it can explain problems back to Claude.
export const ModelMatchSchema = z.object({
  readings: z.array(ReadingSchema).describe("One reading for every answer you cite, written before anything else."),
  kind: z.preprocess((v) => (typeof v === "string" ? v.toLowerCase() : v), z.enum(["overlap", "contrast"])),
  headline: z.string().describe("At most 12 words. A friend's observation, not a label. No quotation marks."),
  detail: z.string(),
  link: z.object({ a: RefSchema, b: RefSchema }),
  starters: z.array(z.object({ text: z.string().describe("One natural, open question joining both people's answers, at most 25 words, no quotation marks."), a: RefSchema, b: RefSchema })),
  challenge: z.object({ text: z.string(), a: RefSchema, b: RefSchema }),
});
export type VennResult = z.infer<typeof ModelMatchSchema>;

export const MatchRequestSchema = z.object({
  a: CardSchema,
  b: CardSchema,
  mode: z.enum(["auto", "demo"]),
  variant: z.number().int().min(0).max(9),
  avoid: z.array(z.string().max(200)).max(12),
});
export type MatchRequest = z.infer<typeof MatchRequestSchema>;

export type MatchResponse =
  | { ok: true; result: VennResult; source: "claude" | "demo"; notice: string | null }
  | { ok: false; error: string; canUseDemo: boolean };

// JSON Schema sent to Claude for structured output (no length/count limits —
// Claude's structured outputs don't support them).
const ref = {
  type: "object",
  additionalProperties: false,
  required: ["answer_id", "quote"],
  properties: {
    answer_id: { type: "string", description: "A1-A6 / B1-B6 (only those on the card) for free-text answers, or e.g. A-fo2 for a pack answer" },
    quote: { type: "string", description: "Hidden evidence for our checker: 1–6 words copied exactly from that answer. Never shown to users." },
  },
};
const cited = (desc: string) => ({
  type: "object",
  additionalProperties: false,
  required: ["text", "a", "b"],
  properties: { text: { type: "string", description: desc }, a: ref, b: ref },
});
export const CLAUDE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readings", "kind", "headline", "detail", "link", "starters", "challenge"],
  properties: {
    readings: { type: "array", description: "One reading for every answer you cite, written before anything else.", items: {
      type: "object", additionalProperties: false, required: ["answer_id", "kind", "gloss"], properties: {
        answer_id: { type: "string" }, kind: { type: "string", enum: [...READING_KINDS] },
        gloss: { type: "string", description: "At most 10 words: what this is. Use 'not sure what this is' if unsure." },
      },
    } },
    kind: { type: "string", enum: ["overlap", "contrast"] },
    headline: { type: "string", description: "At most 12 words. A friend's observation, not a label. No quotation marks." },
    detail: { type: "string", description: "One sentence, at most 25 words." },
    link: { type: "object", additionalProperties: false, required: ["a", "b"], properties: { a: ref, b: ref } },
    starters: { type: "array", description: "Exactly 3 starters", items: cited("One natural, open question joining both people's answers, at most 25 words, no quotation marks.") },
    challenge: cited("At most 30 words"),
  },
};
