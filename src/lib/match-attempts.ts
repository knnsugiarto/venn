import type { Card } from "./card";
import type { VennResult } from "./match-schema";
import { checkMatch } from "./guard";

/** Exactly one quality retry. Only fact-safe candidates may be displayed. */
export async function checkedAttempts(a: Card, b: Card, avoid: string[], generate: (problems?: string[]) => Promise<VennResult>, logStyle: (codes: string[]) => void = () => {}) {
  let best: { result: VennResult; count: number } | undefined;
  let feedback: string[] | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    const check = checkMatch(await generate(feedback), a, b, avoid);
    logStyle(check.styleProblems.map(p => p.slice(0, 2)));
    if (check.ok) {
      if (!best || check.styleProblems.length < best.count) best = { result: check.result, count: check.styleProblems.length };
      if (!check.styleProblems.length) return check.result;
      if (attempt === 1) return best.result;
    } else if (attempt === 1) return null;
    feedback = [...check.problems, ...check.styleProblems];
  }
  return null;
}