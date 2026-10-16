import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { MatchRequestSchema, type MatchResponse } from "./match-schema";
import { isExpired } from "./card";
import { cardIsReady } from "./readiness";
import { demoMatch } from "./demo-match";
import { checkMatch } from "./guard";
import { allow } from "./rate-limit";
import { checkedAttempts } from "./match-attempts";

// The only server endpoint. Cards pass through once and are never saved or logged.
export const matchCards = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (JSON.stringify(input ?? null).length > 8192) throw new Error("Those cards are too big.");
    const parsed = MatchRequestSchema.safeParse(input);
    if (!parsed.success) throw new Error("One of the cards isn't valid. Ask them to show their code again.");
    return parsed.data;
  })
  .handler(async ({ data }): Promise<MatchResponse> => {
    const ip = (getRequestHeader("x-forwarded-for") ?? getRequestHeader("cf-connecting-ip") ?? "unknown").split(",")[0]?.trim() ?? "unknown";
    if (!allow(ip)) return { ok: false, error: "Lots of Venns right now. Wait a minute and try again.", canUseDemo: true };

    const { a, b, mode, variant, avoid } = data;
    if (isExpired(a) || isExpired(b)) return { ok: false, error: "One of the cards has expired. Ask them to show their code again.", canUseDemo: false };
    if (!cardIsReady(a) || !cardIsReady(b)) return { ok: false, error: "That card needs a few more answers.", canUseDemo: false };
    if (a.id === b.id) return { ok: false, error: "That's your own card!", canUseDemo: false };

    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (mode === "demo" || !apiKey) {
      const out = demoMatch(a, b, variant);
      const g = checkMatch(out, a, b, []);
      if (!g.ok) return { ok: false, error: "Demo mode couldn't make a Venn for these cards.", canUseDemo: false };
      return { ok: true, result: g.result, source: "demo", notice: apiKey ? null : "Claude isn't connected yet, so this is the simple demo matcher." };
    }

    const { matchWithClaude, ClaudeError } = await import("./claude.server");
    try {
      const result = await checkedAttempts(a, b, avoid,
        problems => matchWithClaude(a, b, variant, avoid, problems, apiKey),
        codes => { if (codes.length) console.info("match: style", codes.join(",")); });
      if (result) return { ok: true, result, source: "claude", notice: null };
      setResponseStatus(502);
      console.error("match: guard failed twice");
      return { ok: false, error: "Claude's answer didn't pass our checks. Try again.", canUseDemo: true };
    } catch (e) {
      const kind = e instanceof ClaudeError ? e.kind : "unknown";
      console.error("match: claude error", kind); // error type only, never card text
      const msg = kind === "timeout" ? "Claude took too long. Try again." : kind === "busy" ? "Claude is busy. Try again in a moment." : "Venn can't reach Claude right now.";
      return { ok: false, error: msg, canUseDemo: true };
    }
  });
