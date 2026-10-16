import { contextPairs } from "./context-pairs";
import { matchWithClaude } from "../src/lib/claude.server";
import { checkMatch } from "../src/lib/guard";
import { checkedAttempts } from "../src/lib/match-attempts";

// Offline operator tool only; never deployed or called by the app.
const key = process.env["ANTHROPIC_API_KEY"];
if (!key) {
  console.error("Context evaluation blocked: ANTHROPIC_API_KEY is absent. Demo output is not evidence of Claude understanding.");
  process.exitCode = 1;
} else {
  let correct = 0, total = 0, facts = 0, styles = 0, remaining = 0;
  const times: number[] = [];
  const counts: Record<string, number> = { S1: 0, S2: 0, S3: 0, S4: 0 };
  console.log("pair\trun\tkinds\tfirst facts\tfirst style\tstyle after retry\tlatency ms\tglosses look right? (y/n)\tsounds natural? (y/n)\treview\treadings");
  outer: for (const pair of contextPairs()) for (let run = 0; run < 3; run++) {
    const start = performance.now();
    let first = true;
    let firstFacts = false, firstStyle = false, kinds = 0;
    try {
      const result = await checkedAttempts(pair.a, pair.b, [], async feedback => {
        const out = await matchWithClaude(pair.a, pair.b, run, [], feedback, key);
        const g = checkMatch(out, pair.a, pair.b);
        if (first) {
          first = false; firstFacts = g.ok; firstStyle = g.styleProblems.length === 0;
          facts += Number(firstFacts); styles += Number(firstStyle);
          for (const code of new Set(g.styleProblems.map(p => p.slice(0, 2)))) counts[code] = (counts[code] ?? 0) + 1;
          for (const [id, expected] of Object.entries(pair.expected)) {
            total++; const reading = out.readings.find(r => r.answer_id === id);
            if (reading && expected.includes(reading.kind)) { correct++; kinds++; }
          }
        }
        return out;
      });
      const ms = Math.round(performance.now() - start); times.push(ms);
      const styleLeft = result ? checkMatch(result, pair.a, pair.b).styleProblems.length : -1;
      remaining += Number(styleLeft > 0);
      const review = pair.id === 8 && result?.link.a.answer_id === "A1" ? "FAIL: Zorblax link" : pair.review;
      console.log([pair.id, run + 1, kinds, firstFacts, firstStyle, styleLeft, ms, "", "", review, JSON.stringify(result?.readings ?? [])].join("\t"));
    } catch {
      console.error("Evaluation stopped on provider/configuration failure; no automatic transport retry or alternate model.");
      process.exitCode = 1; break outer;
    }
  }
  times.sort((a, b) => a - b);
  console.log(JSON.stringify({ kindAccuracy: total ? correct / total : null, firstFactPass: facts / 30, firstStylePass: styles / 30, styleCodes: counts, remainingAfterRetry: remaining / 30, medianLatencyMs: times[Math.floor(times.length / 2)] ?? null }));
}
