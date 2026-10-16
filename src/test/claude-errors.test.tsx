import { describe, expect, it } from "vitest";
import { createCard } from "@/lib/card";
import {
  classifyError,
  ClaudeError,
  CLAUDE_ERROR_MESSAGES,
  matchWithClaude,
} from "@/lib/claude.server";
import { demoMatch } from "@/lib/demo-match";

const a = createCard({
  id: "kenaaaa1",
  n: "Ken",
  c: "",
  a: [
    ["fd", "Hot pot"],
    ["us", "Whistling"],
    ["rc", "Outer Wilds"],
  ],
});
const b = createCard({
  id: "amaraaa2",
  n: "Amara",
  c: "",
  a: [
    ["fd", "Jollof rice"],
    ["sg", "Dancing Queen"],
    ["vs", "Primrose Hill"],
  ],
});
const err = (type: string, message: string) =>
  JSON.stringify({ type: "error", error: { type, message } });
const fake = (status: number, body: string) =>
  (async () => new Response(body, { status })) as unknown as typeof fetch;

describe("Claude errors say what actually went wrong", () => {
  it.each([
    [401, err("authentication_error", "invalid x-api-key"), "auth"],
    [
      400,
      err(
        "invalid_request_error",
        "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
      ),
      "credit",
    ],
    [404, err("not_found_error", "model: claude-haiku-9"), "model"],
    [429, err("rate_limit_error", "Number of requests has exceeded your rate limit"), "rate"],
    [529, err("overloaded_error", "Overloaded"), "busy"],
    [
      400,
      err("invalid_request_error", "output_config.format.schema: something unsupported"),
      "rejected",
    ],
  ])("status %i → %s", (status, body, kind) => {
    const e = classifyError(status, body);
    expect(e.kind).toBe(kind);
    expect(e.detail).toContain(String(status));
    expect(CLAUDE_ERROR_MESSAGES[e.kind]).toBeTruthy();
  });

  it("the credit message tells you where to fix it", () => {
    expect(CLAUDE_ERROR_MESSAGES.credit).toMatch(/Billing/);
    expect(CLAUDE_ERROR_MESSAGES.auth).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("matchWithClaude throws the classified error", async () => {
    await expect(
      matchWithClaude(
        a,
        b,
        0,
        [],
        undefined,
        "k",
        fake(400, err("invalid_request_error", "Your credit balance is too low")),
      ),
    ).rejects.toMatchObject({ kind: "credit" });
  });

  it("a good reply still parses", async () => {
    const reply = JSON.stringify({
      content: [{ type: "text", text: JSON.stringify(demoMatch(a, b)) }],
      stop_reason: "end_turn",
    });
    const out = await matchWithClaude(a, b, 0, [], undefined, "k", fake(200, reply));
    expect(out.starters).toHaveLength(3);
  });

  it("a malformed reply is bad_reply with only field paths in the detail", async () => {
    const reply = JSON.stringify({
      content: [{ type: "text", text: JSON.stringify({ headline: "secret answer text" }) }],
      stop_reason: "end_turn",
    });
    const e = await matchWithClaude(a, b, 0, [], undefined, "k", fake(200, reply)).catch(
      (x: unknown) => x,
    );
    expect(e).toBeInstanceOf(ClaudeError);
    expect((e as ClaudeError).kind).toBe("bad_reply");
    expect((e as ClaudeError).detail).not.toContain("secret answer text");
  });
});
