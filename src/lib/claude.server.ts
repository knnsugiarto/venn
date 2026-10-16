import type { Card } from "./card";
import { CLAUDE_JSON_SCHEMA, ModelMatchSchema, type VennResult } from "./match-schema";
import { SYSTEM_PROMPT, buildMatchMessage } from "./match-prompt";

// The only file that talks to Claude. Server only (".server.ts"), so the API key
// can never be bundled into the browser.

export class ClaudeError extends Error {
  constructor(public kind: "timeout" | "auth" | "rate" | "busy" | "bad_reply") {
    super(kind);
  }
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
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 1400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildMatchMessage(a, b, variant, avoid, problems) }],
        output_config: { format: { type: "json_schema", schema: CLAUDE_JSON_SCHEMA } },
      }),
    });
  } catch {
    throw new ClaudeError("timeout");
  }
  if (res.status === 401 || res.status === 403) throw new ClaudeError("auth");
  if (res.status === 429) throw new ClaudeError("rate");
  if (!res.ok) throw new ClaudeError(res.status >= 500 ? "busy" : "bad_reply");

  const data = (await res.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
  if (data.stop_reason === "refusal" || data.stop_reason === "max_tokens") throw new ClaudeError("bad_reply");
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new ClaudeError("bad_reply");
  try {
    const parsed = ModelMatchSchema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new ClaudeError("bad_reply");
    return parsed.data;
  } catch {
    throw new ClaudeError("bad_reply");
  }
}
