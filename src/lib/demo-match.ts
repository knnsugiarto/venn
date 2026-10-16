import type { Card } from "./card";
import type { Ref, VennResult } from "./match-schema";
import { answerList, type Answer } from "./answers";
import { getPrompt } from "./prompts";

// Simple rules, never semantic AI. Always labelled Demo mode · not Claude.
// It still has to be specific: it uses people's actual words (cut to a short
// phrase, never in quotation marks) rather than vague labels like "your skill".
const STOP = new Set([
  "with",
  "from",
  "that",
  "this",
  "have",
  "just",
  "really",
  "every",
  "about",
  "only",
  "when",
  "what",
  "your",
  "they",
  "them",
  "then",
  "than",
  "there",
  "into",
  "like",
  "some",
  "would",
  "could",
  "much",
  "very",
  "more",
  "most",
  "were",
  "been",
  "also",
  "over",
  // Too common to be a meaningful overlap ("fifth time round" vs "every single time").
  "time",
  "times",
  "single",
  "round",
  "first",
  "always",
  "never",
  "thing",
  "things",
  "good",
  "best",
  "made",
  "make",
  "love",
  "still",
  "ever",
  "even",
  "after",
  "before",
  "where",
  "which",
  "while",
  "around",
  "back",
  "other",
  "little",
  "great",
  "lots",
  "kind",
  "sort",
  "proper",
  "actually",
  "basically",
  "literally",
  "obviously",
  "honestly",
]);
const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "at",
  "of",
  "in",
  "on",
  "to",
  "for",
  "with",
  "and",
  "or",
  "my",
  "your",
  "by",
  "from",
  "as",
  "but",
  "so",
]);
const LOWER_FIRST = new Set([
  "a",
  "an",
  "the",
  "my",
  "some",
  "every",
  "any",
  "anything",
  "always",
  "proper",
  "fresh",
  "our",
  "his",
  "her",
  "their",
]);
const LIMITS = { headline: 90, detail: 200, starter: 160, challenge: 200 };

const lead = (text: string) => (/^\s*\S+(?:\s+\S+){0,2}/u.exec(text)?.[0] ?? text).trim();
const evidence = (x: Answer): Ref => ({ answer_id: x.id, quote: lead(x.text) });
const pick = <T>(items: T[], i: number): T => {
  const item = items[i % items.length];
  if (item === undefined) throw new Error("No demo answers");
  return item;
};

/** The person's own words, short enough to read inside a sentence: the first
 * clause (up to a comma, colon or full stop), at most `max` words, never ending on
 * a dangling "at a", no quotation marks. Kept under 8 words so it never trips the
 * guard's "pasted a whole answer" style rule. */
export function phrase(text: string, max = 7): string {
  const clean = text.replace(/["“”„«»]/gu, "").trim();
  const clause = clean.split(/[,:;.!?]|\s[–—-]\s/u)[0]?.trim() || clean;
  const words = clause.split(/\s+/u).filter(Boolean).slice(0, max);
  while (words.length > 1 && FUNCTION_WORDS.has(words[words.length - 1]!.toLowerCase()))
    words.pop();
  const w0 = words[0];
  // Phones capitalise the first letter of every answer. Lower-case it mid-sentence
  // unless it looks like a name: "I", a one-word clause (Lisbon, Jakarta) or
  // followed by other capitalised words (Primrose Hill, Brooklyn Nine-Nine).
  const looksLikeName =
    w0 === "I" || words.length === 1 || words.slice(1).some((w) => /^\p{Lu}/u.test(w));
  if (w0 && (LOWER_FIRST.has(w0.toLowerCase()) || !looksLikeName))
    words[0] = w0.charAt(0).toLowerCase() + w0.slice(1);
  return words.join(" ") || clean;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Short label for what the answer is about, e.g. "useless skill". */
const about = (card: Card, answer: Answer) => {
  if (answer.kind === "pack") return answer.source;
  const entry = card.a[Number(answer.id.slice(1)) - 1];
  return entry ? getPrompt(entry[0]).short : "answer";
};

/** Tries the full sentence, then shorter versions, so length limits never fail the guard. */
function fit(limit: number, build: (n: number) => string, fallback: string): string {
  for (const n of [7, 4, 2]) {
    const s = build(n);
    if (s.length <= limit) return s;
  }
  return fallback;
}

type Side = { name: string; course: string; card: Card; x: Answer };
type Line = (A: Side, B: Side, n: number) => string;

const say = (s: Side, n: number) => phrase(s.x.text, n);
const label = (s: Side) => about(s.card, s.x);

// Every template names the actual things people wrote. Openings vary so the three
// starters never begin the same way (style rule S4).
const STARTERS: Line[] = [
  (A, B, n) =>
    `${A.name}'s ${label(A)}: ${say(A, n)}. ${B.name}'s ${label(B)}: ${say(B, n)}. Which one wins over a room of strangers faster?`,
  (A, B, n) =>
    `${B.name}, ${A.name}'s ${label(A)} is this: ${say(A, n)}. How would your ${label(B)}, ${say(B, n)}, hold up against it?`,
  (A, B, n) =>
    `Plan one evening around these two. ${A.name}: ${say(A, n)}. ${B.name}: ${say(B, n)}. Where do you start?`,
  (A, B, n) =>
    `Swap test: ${A.name} lives with ${say(B, n)} for a week, ${B.name} with ${say(A, n)}. Who cracks first?`,
  (A, B, n) =>
    `Two things that need explaining. ${A.name}'s ${label(A)}: ${say(A, n)}. ${B.name}'s ${label(B)}: ${say(B, n)}. Who goes first?`,
  (A, B, n) =>
    A.course
      ? `${A.name} studies ${A.course} and picked ${say(A, n)} as their ${label(A)}. ${B.name}, does ${say(B, n)} make more sense?`
      : `${B.name}'s ${label(B)}: ${say(B, n)}. ${A.name}'s ${label(A)}: ${say(A, n)}. Which has the better backstory?`,
];

const CHALLENGES: Line[] = [
  (A, B, n) =>
    `Five words each. ${A.name} sells ${say(A, n)}, ${B.name} sells ${say(B, n)}. Then guess what the other left out.`,
  (A, B, n) =>
    `Make up a tiny advert that joins ${say(A, n)} and ${say(B, n)}. Give it a name together.`,
  (A, B, n) =>
    `${B.name}, argue for ${say(A, n)} for 30 seconds. ${A.name}, return the favour for ${say(B, n)}.`,
  (A, B, n) =>
    `Agree on a five-word motto that fits both ${say(A, n)} and ${say(B, n)}. Say it together.`,
];

export function demoMatch(a: Card, b: Card, variant = 0): VennResult {
  const allA = answerList(a, "A");
  const allB = answerList(b, "B");
  const coreA = allA.filter((x) => x.kind === "core");
  const coreB = allB.filter((x) => x.kind === "core");
  const side = (card: Card, x: Answer): Side => ({ name: card.n, course: card.c.trim(), card, x });

  const shared = coreA.flatMap((x) =>
    coreB.flatMap((y) => {
      const words = [...x.text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => m[0].toLowerCase());
      const others = new Set(
        [...y.text.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => m[0].toLowerCase()),
      );
      const word = words.find((w) => w.length >= 4 && !STOP.has(w) && others.has(w));
      return word ? [{ x, y, word }] : [];
    }),
  );
  const match = shared.length ? pick(shared, variant) : null;
  const linkA = match?.x ?? pick(coreA, variant);
  const linkB = match?.y ?? pick(coreB, variant + 2);

  const starters = [0, 1, 2].map((k) => {
    // Step by 3 per variant so "Another one" pairs up different answers, not a reshuffle.
    const x = pick(coreA, variant * 3 + k);
    const y = pick(coreB, variant * 3 + k + 2);
    const tpl = pick(STARTERS, variant * 3 + k);
    const text = fit(
      LIMITS.starter,
      (n) => tpl(side(a, x), side(b, y), n),
      `${a.n} and ${b.n}, swap one detail from your cards and ask one question each.`,
    );
    return { text, a: evidence(x), b: evidence(y) };
  });

  const packPair = allA
    .filter((x) => x.kind === "pack")
    .flatMap((x) => {
      const y = allB.find((y) => y.id.slice(1) === x.id.slice(1) && y.text === x.text);
      return y ? [{ x, y }] : [];
    });
  if (packPair.length) {
    const { x, y } = pick(packPair, variant);
    const question = x.label.split(" · ")[1] ?? x.label;
    starters[2] = {
      text: fit(
        LIMITS.starter,
        () =>
          `You both picked ${x.text} for ${question.replace(/\?$/u, "")}. Who would defend it harder, and why?`,
        `You both picked ${x.text}. Who would defend it harder?`,
      ),
      a: evidence(x),
      b: evidence(y),
    };
  }

  const ca = pick(coreA, variant + 3);
  const cb = pick(coreB, variant + 3);
  const tplC = pick(CHALLENGES, variant);
  const challenge = {
    text: fit(
      LIMITS.challenge,
      (n) => tplC(side(a, ca), side(b, cb), n),
      "Swap one detail from your cards and explain it in five words each.",
    ),
    a: evidence(ca),
    b: evidence(cb),
  };

  const headline = match
    ? fit(
        LIMITS.headline,
        () => `Both your cards have a bit of ${match.word} in them`,
        "Your cards overlap more than you'd think",
      )
    : fit(
        LIMITS.headline,
        (n) => `${cap(phrase(linkA.text, n))} meets ${phrase(linkB.text, n)}`,
        "Two very different cards, one good conversation",
      );
  const detail = fit(
    LIMITS.detail,
    (n) =>
      `${a.n}'s ${about(a, linkA)}: ${phrase(linkA.text, n)}. ${b.n}'s ${about(b, linkB)}: ${phrase(linkB.text, n)}.`,
    `${a.n} and ${b.n} wrote very different things.`,
  );

  const link = { a: evidence(linkA), b: evidence(linkB) };
  const ids = new Set(
    [link, ...starters, challenge].flatMap((x) => [x.a.answer_id, x.b.answer_id]),
  );
  return {
    readings: [...ids].map((answer_id) => ({
      answer_id,
      kind: "other",
      gloss: "read by simple rules, not Claude",
    })),
    kind: match ? "overlap" : "contrast",
    headline,
    detail,
    link,
    starters,
    challenge,
  };
}
