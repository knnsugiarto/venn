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

    // Trim: a key pasted with a trailing space or newline is otherwise rejected.
    const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim();
    if (mode === "demo" || !apiKey) {
      const out = demoMatch(a, b, variant);
      const g = checkMatch(out, a, b, []);
      if (!g.ok) return { ok: false, error: "Demo mode couldn't make a Venn for these cards.", canUseDemo: false };
      return { ok: true, result: g.result, source: "demo", notice: apiKey ? null : "Claude isn't connected yet, so this is the simple demo matcher." };
    }

    const { matchWithClaude, ClaudeError, CLAUDE_ERROR_MESSAGES } = await import("./claude.server");
    try {
      // An unreadable reply (cut off, refused, wrong shape) is usually a one-off,
      // so ask once more before giving up.
      const generate = async (problems?: string[]) => {
        try {
          return await matchWithClaude(a, b, variant, avoid, problems, apiKey);
        } catch (e) {
          if (e instanceof ClaudeError && e.kind === "bad_reply") {
            console.error("match: claude error bad_reply (retrying)", e.detail);
            return matchWithClaude(a, b, variant, avoid, problems, apiKey);
          }
          throw e;
        }
      };
      const result = await checkedAttempts(a, b, avoid,
        generate,
        codes => { if (codes.length) console.info("match: style", codes.join(",")); });
      if (result) return { ok: true, result, source: "claude", notice: null };
      setResponseStatus(502);
      console.error("match: guard failed twice");
      return { ok: false, error: "Claude's answer didn't pass our checks. Try again.", canUseDemo: true };
    } catch (e) {
      // Log the kind plus Anthropic's status and error message (never card text or
      // the key), so "Logs" in Vercel shows exactly what went wrong.
      if (e instanceof ClaudeError) {
        console.error("match: claude error", e.kind, e.detail);
        // For unreadable or rejected replies, show a short code so the team can see
        // the cause on the phone. It holds a status, stop reason or field names only.
        const code = e.kind === "bad_reply" || e.kind === "rejected" ? ` (code: ${e.detail.slice(0, 80)})` : "";
        return { ok: false, error: CLAUDE_ERROR_MESSAGES[e.kind] + code, canUseDemo: true };
      }
      console.error("match: claude error unknown", e instanceof Error ? e.name : typeof e);
      return { ok: false, error: "Venn can't reach Claude right now. Try again.", canUseDemo: true };
    }
  });
