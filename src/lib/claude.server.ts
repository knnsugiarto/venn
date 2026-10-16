import type { Card } from "./card";
import { CLAUDE_JSON_SCHEMA, ModelMatchSchema, type VennResult } from "./match-schema";
import { SYSTEM_PROMPT, buildMatchMessage } from "./match-prompt";

// The only file that talks to Claude. Server only (".server.ts"), so the API key
// can never be bundled into the browser.

export type ClaudeErrorKind =
  "timeout" | "auth" | "credit" | "model" | "rate" | "busy" | "rejected" | "bad_reply";

export class ClaudeError extends Error {
  constructor(
    public kind: ClaudeErrorKind,
    /** HTTP status and Anthropic's own error message, for the server log only. */
    public detail = "",
  ) {
    super(kind);
  }
}

/** What the person sees. Specific enough to fix the problem, no secrets. */
export const CLAUDE_ERROR_MESSAGES: Record<ClaudeErrorKind, string> = {
  timeout: "Claude took too long. Try again.",
  busy: "Claude is busy. Try again in a moment.",
  auth: "Claude rejected the API key. Check ANTHROPIC_API_KEY in Vercel, then redeploy.",
  credit:
    "The Claude API account has no credit left. Add credit in the Claude Console (Settings > Billing).",
  model: "Claude doesn't recognise the model name. Check VENN_MODEL in Vercel (or remove it).",
  rate: "Too many requests to Claude right now. Wait a minute and try again.",
  rejected: "Claude rejected the request. Check the Vercel logs for 'match: claude error'.",
  bad_reply: "Claude's reply couldn't be read. Try again.",
};

/** Turns Anthropic's error response into a kind. Anthropic sends
 * { error: { type, message } }; the message never contains the card text. */
export function classifyError(status: number, body: string): ClaudeError {
  let type = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as { error?: { type?: string; message?: string } };
    type = parsed.error?.type ?? "";
    message = parsed.error?.message ?? "";
  } catch {
    message = body;
  }
  const detail = `${status} ${type} ${message}`.trim().slice(0, 300);
  if (
    status === 401 ||
    status === 403 ||
    type === "authentication_error" ||
    type === "permission_error"
  )
    return new ClaudeError("auth", detail);
  if (/credit balance|billing|purchase credits/i.test(message))
    return new ClaudeError("credit", detail);
  if (status === 404 || (type === "not_found_error" && /model/i.test(message)))
    return new ClaudeError("model", detail);
  if (status === 429 || type === "rate_limit_error") return new ClaudeError("rate", detail);
  if (status >= 500 || type === "overloaded_error") return new ClaudeError("busy", detail);
  return new ClaudeError("rejected", detail);
}

export type Fetcher = typeof fetch;

export async function matchWithClaude(
  a: Card,
  b: Card,
  variant: number,
  avoid: string[],
  problems: string[] | undefined,
  apiKey: string,
  fetcher: Fetcher = fetch,
): Promise<VennResult> {
  const model = process.env["VENN_MODEL"] || "claude-haiku-5-5";
  let res: Response;
  try {
    res = await fetcher("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(20_000),
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildMatchMessage(a, b, variant, avoid, problems) }],
        output_config: { format: { type: "json_schema", schema: CLAUDE_JSON_SCHEMA } },
      }),
    });
  } catch (e) {
    throw new ClaudeError("timeout", e instanceof Error ? e.name : "network");
  }
  if (!res.ok) throw classifyError(res.status, await res.text().catch(() => ""));

  const data = (await res.json()) as {
    stop_reason?: string;
    content?: { type: string; text?: string }[];
  };
  if (data.stop_reason === "refusal" || data.stop_reason === "max_tokens")
    throw new ClaudeError("bad_reply", `stop_reason ${data.stop_reason}`);
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new ClaudeError("bad_reply", "no text block");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ClaudeError("bad_reply", "reply was not JSON");
  }
  const parsed = ModelMatchSchema.safeParse(json);
  // Log only the paths that failed, never the generated text.
  if (!parsed.success)
    throw new ClaudeError(
      "bad_reply",
      `schema: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")
        .slice(0, 200)}`,
    );
  return parsed.data;
}
