import type { Card } from "./card";
import type { Ref, VennResult } from "./match-schema";
import { answerList, type Answer } from "./answers";
import { getPrompt } from "./prompts";

// Simple rules, never semantic AI. Always labelled Demo mode · not Claude.
const STOP = new Set(["with", "from", "that", "this", "have", "just", "really", "every", "about", "only", "when", "what", "your", "they", "them", "then", "than", "there", "into", "like", "some", "would", "could", "much", "very", "more", "most", "were", "been", "also", "over"]);
const lead = (text: string) => (/^\s*\S+(?:\s+\S+){0,2}/u.exec(text)?.[0] ?? text).trim();
const evidence = (x: Answer): Ref => ({ answer_id: x.id, quote: lead(x.text) });
const pick = <T,>(items: T[], i: number): T => {
  const item = items[i % items.length];
  if (item === undefined) throw new Error("No demo answers");
  return item;
};
const topic = (card: Card, answer: Answer) => {
  const entry = card.a[Number(answer.id.slice(1)) - 1];
  return entry ? getPrompt(entry[0]).topic : "quick pick";
};

export function demoMatch(a: Card, b: Card, variant = 0): VennResult {
  const allA = answerList(a, "A");
  const allB = answerList(b, "B");
  const coreA = allA.filter(x => x.kind === "core");
  const coreB = allB.filter(x => x.kind === "core");
  const shared = coreA.flatMap(x => coreB.flatMap(y => {
    const words = [...x.text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => m[0].toLowerCase());
    const others = new Set([...y.text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => m[0].toLowerCase()));
    const word = words.find(w => w.length >= 4 && !STOP.has(w) && others.has(w));
    return word ? [{ x, y, word }] : [];
  }));
  const match = shared.length ? pick(shared, variant) : null;
  const linkA = match?.x ?? pick(coreA, variant);
  const linkB = match?.y ?? pick(coreB, variant + 2);
  const templates: ((ta: string, tb: string) => string)[] = [
    (ta, tb) => `What happens when your ${ta} meets a ${tb}?`,
    (ta, tb) => `How would a ${ta} change your approach to a ${tb}?`,
    (ta, tb) => `Quick debate: which deserves more attention, a ${ta} or a ${tb}?`,
    (ta, tb) => `Where does a ${ta} belong in a day built around a ${tb}?`,
    (ta, tb) => `Which matters more on a rainy day, a ${ta} or a ${tb}?`,
    (ta, tb) => `Imagine swapping your ${ta} for a ${tb}: what surprises you first?`,
    (ta, tb) => `Pick one: how would you combine a ${ta} and a ${tb} in London?`,
    (ta, tb) => `Be honest: what could a ${ta} teach you about a ${tb}?`,
  ];
  const starters = [0, 1, 2].map(k => {
    const x = pick(coreA, variant + k);
    const y = pick(coreB, variant + k + 2);
    return { text: pick(templates, variant + k)(topic(a, x), topic(b, y)), a: evidence(x), b: evidence(y) };
  });
  const packPair = allA.filter(x => x.kind === "pack").flatMap(x => {
    const y = allB.find(y => y.id.slice(1) === x.id.slice(1) && y.text === x.text);
    return y ? [{ x, y }] : [];
  });
  if (packPair.length) {
    const { x, y } = pick(packPair, variant);
    starters[2] = { text: `Small world: what makes your ${x.source.toLowerCase()} pick worth defending?`, a: evidence(x), b: evidence(y) };
  }
  const ca = pick(coreA, variant + 3);
  const cb = pick(coreB, variant + 3);
  const challenges = [
    `${a.n}, pitch your ${topic(a, ca)} in three words. ${b.n}, answer with three about your ${topic(b, cb)}.`,
    `Invent a tiny advert joining your ${topic(a, ca)} and ${topic(b, cb)}. Give it a name together.`,
    `Take turns defending the other's ${topic(a, ca)} or ${topic(b, cb)} for 30 seconds. Make it convincing.`,
    `Build a five-word motto for your ${topic(a, ca)} and ${topic(b, cb)}. Agree on the last word.`,
  ];
  const link = { a: evidence(linkA), b: evidence(linkB) };
  const challenge = { text: pick(challenges, variant), a: evidence(ca), b: evidence(cb) };
  const ids = new Set([link, ...starters, challenge].flatMap(x => [x.a.answer_id, x.b.answer_id]));
  return {
    readings: [...ids].map(answer_id => ({ answer_id, kind: "other", gloss: "read by simple rules, not Claude" })),
    kind: match ? "overlap" : "contrast",
    headline: match ? `There's a little ${match.word} in each of your worlds` : "Your different worlds might make a good double act",
    detail: `${a.n}'s ${topic(a, linkA)} meets ${b.n}'s ${topic(b, linkB)}.`,
    link, starters, challenge,
  };
}
