import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createCard } from "@/lib/card";
import { PROMPTS } from "@/lib/prompts";
import { demoMatch } from "@/lib/demo-match";
import { checkMatch, STOCK_PHRASES } from "@/lib/guard";
import { CLAUDE_JSON_SCHEMA, ModelMatchSchema } from "@/lib/match-schema";
import { checkedAttempts } from "@/lib/match-attempts";
import { CardBuilder } from "@/components/CardBuilder";
import { VennResultView } from "@/components/VennResult";
import { Home } from "@/routes/index";
import { clearProfile, OLD_CARD_KEY } from "@/lib/profile";

vi.mock("@tanstack/react-router", async importOriginal => {
  const real = await importOriginal<typeof import("@tanstack/react-router")>();
  return { ...real, Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => <a href={to} {...props}>{children}</a>, createFileRoute: () => (options: object) => ({ ...options, useSearch: () => ({}) }) };
});
vi.mock("@/components/QrImage", () => ({ QrImage: () => <div aria-label="QR code" /> }));
const a = createCard({ id: "samaaaa1", n: "Sam", c: "", a: [["fd", "Pasta after a walk around the museum"], ["us", "juggle oranges"], ["sg", "ABBA"], ["wd", "Sunday walks"], ["rc", "Outer Wilds"]] });
const b = createCard({ id: "priyaaa2", n: "Priya", c: "", a: [["fd", "carbonara"], ["us", "whistle loudly"], ["sg", "Dancing Queen"], ["wd", "Free museums"], ["rc", "Twilight"]] });
const good = () => demoMatch(a, b);
beforeEach(() => { clearProfile(); window.localStorage.clear(); });
afterEach(cleanup);

describe("placeholder behaviour", () => {
  it("all twelve prompts have unique nonempty hints without the removed phrases", () => {
    expect(PROMPTS).toHaveLength(12);
    expect(new Set(PROMPTS.map(p => p.placeholder)).size).toBe(12);
    for (const p of PROMPTS) {
      expect(p.placeholder.trim().length).toBeGreaterThan(0);
      expect(p.placeholder).not.toMatch(/jollof|aunt|nan's/i);
    }
  });
  it("empty input never submits its hint", () => {
    const done = vi.fn(); render(<CardBuilder onDone={done} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
    fireEvent.submit(input.closest("form") as HTMLFormElement);
    expect(done).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});

describe("readings", () => {
  it("requires one reading per cited ID", () => {
    const out = good();
    expect(checkMatch({ ...out, readings: out.readings.slice(1) }, a, b).ok).toBe(false);
    expect(checkMatch({ ...out, readings: [...out.readings, out.readings[0]].filter(x => x !== undefined) }, a, b).ok).toBe(false);
  });
  it("rejects nonexistent readings", () => expect(checkMatch({ ...good(), readings: [...good().readings, { answer_id: "A99", kind: "other", gloss: "thing" }] }, a, b).ok).toBe(false));
  it("rejects empty and 81-character glosses", () => {
    for (const gloss of ["", "x".repeat(81)]) expect(checkMatch({ ...good(), readings: good().readings.map((r, i) => i === 0 ? { ...r, gloss } : r) }, a, b).ok).toBe(false);
  });
  it("rejects unknown on both link sides, accepts one", () => {
    const out = good();
    const unknown = (both: boolean) => out.readings.map(r => r.answer_id === out.link.a.answer_id || both && r.answer_id === out.link.b.answer_id ? { ...r, kind: "unknown" as const } : r);
    expect(checkMatch({ ...out, readings: unknown(true) }, a, b).ok).toBe(false);
    expect(checkMatch({ ...out, readings: unknown(false) }, a, b).ok).toBe(true);
  });
  it("writes readings first and lowercases kinds", () => {
    expect(Object.keys(CLAUDE_JSON_SCHEMA.properties)[0]).toBe("readings");
    const out = good();
    expect(ModelMatchSchema.parse({ ...out, readings: out.readings.map(r => ({ ...r, kind: "OTHER" })) }).readings[0]?.kind).toBe("other");
  });
});

describe("style is separate from facts", () => {
  it.each(['"', '“', '”', '„', '«', '»'])("flags double quotation %s", mark => {
    const g = checkMatch({ ...good(), detail: `Try ${mark}pasta${mark}.` }, a, b);
    expect(g.ok).toBe(true); expect(g.problems).toEqual([]); expect(g.styleProblems.join()).toContain("S1:");
  });
  it("allows apostrophes", () => expect(checkMatch({ ...good(), detail: "You're in for a good chat." }, a, b).styleProblems).toEqual([]));
  it("catches eight-word pastes across case and punctuation, but allows seven", () => {
    const long = createCard({ id: "samaaaa1", n: "Sam", c: "", a: [["fd", "Pasta after a walk around the museum at night"], ...a.a.slice(1)] });
    const out = () => demoMatch(long, b);
    expect(checkMatch({ ...out(), detail: "PASTA, after a walk around the museum at!" }, long, b).styleProblems.join()).toContain("S2:");
    expect(checkMatch({ ...out(), detail: "Pasta after a walk around the museum" }, long, b).styleProblems).toEqual([]);
  });
  it.each(STOCK_PHRASES)("flags stock phrase %s", phrase => expect(checkMatch({ ...good(), detail: phrase.toUpperCase() }, a, b).styleProblems.join()).toContain("S3:"));
  it("rejects repeated two-word openings", () => {
    const out = good(); out.starters = out.starters.map((s, i) => i < 2 ? { ...s, text: `Which would ${i ? "matter more" : "you choose"}?` } : s);
    expect(checkMatch(out, a, b).styleProblems.join()).toContain("S4:");
  });
  it("fact problems never leak into style", () => {
    const out = good(); out.link.a.quote = "invented evidence";
    const g = checkMatch(out, a, b); expect(g.ok).toBe(false); expect(g.problems.length).toBeGreaterThan(0); expect(g.styleProblems).toEqual([]);
  });
});

describe("one quality retry", () => {
  it("returns the fewer-style-problems fact-safe reply after exactly two calls", async () => {
    const generate = vi.fn().mockResolvedValueOnce({ ...good(), detail: '“Fun fact”' }).mockResolvedValueOnce({ ...good(), detail: "Fun fact" });
    const out = await checkedAttempts(a, b, [], generate);
    expect(generate).toHaveBeenCalledTimes(2); expect(out?.detail).toBe("Fun fact");
    expect(generate.mock.calls[1]?.[0].length).toBe(2);
  });
  it("never returns a fact-failed second reply", async () => {
    const bad = good(); bad.link.a.quote = "invented";
    const generate = vi.fn().mockResolvedValue(bad);
    expect(await checkedAttempts(a, b, [], generate)).toBeNull(); expect(generate).toHaveBeenCalledTimes(2);
  });
  it("returns a clean first reply without a retry", async () => {
    const generate = vi.fn().mockResolvedValue(good()); expect(await checkedAttempts(a, b, [], generate)).not.toBeNull(); expect(generate).toHaveBeenCalledTimes(1);
  });
});

describe("screens", () => {
  it("empty storage shows only Start and no fields", async () => {
    render(<Home />); await screen.findByRole("button", { name: "Start" });
    expect(screen.queryAllByRole("button")).toHaveLength(1); expect(screen.queryAllByRole("textbox")).toHaveLength(0);
  });
  it("stored card shows home without Start", async () => {
    window.localStorage.setItem(OLD_CARD_KEY, JSON.stringify(a)); render(<Home />);
    await screen.findByRole("button", { name: /^Show my code$/ }); expect(screen.queryByText("Start")).toBeNull();
  });
  it("receipts show readings only for cited answers, with no quoted chips", () => {
    const out = good(); render(<VennResultView me={a} them={b} result={out} demo notice={null} onAnother={null} onShowCode={() => {}} />);
    expect(screen.getByText(out.detail)).toBeInTheDocument();
    const ids = new Set([out.link, ...out.starters, out.challenge].flatMap(x => [x.a.answer_id, x.b.answer_id]));
    expect(screen.getAllByText(/Read as:/)).toHaveLength(ids.size);
    expect(document.body.textContent).not.toMatch(/["“”]/);
  });
});

describe("demo style property", () => {
  it("50 varied pairs pass all fact and style rules across ten variants", () => {
    for (let i = 0; i < 50; i++) {
      const make = (side: number) => createCard({ n: side ? "Priya" : "Sam", c: "", a: PROMPTS.slice((i + side) % 7, (i + side) % 7 + 5).map(p => [p.id, `${p.id} walk around the museum after lunch`]), p: i % 2 ? { fo: [0, 1, 2, null, null] } : undefined });
      for (let v = 0; v < 10; v++) { const aa = make(0), bb = make(1); const g = checkMatch(demoMatch(aa, bb, v), aa, bb); expect(g.ok).toBe(true); expect(g.styleProblems).toEqual([]); }
    }
  });
});
