import { describe, expect, it, beforeEach } from "vitest";
import { createCard } from "@/lib/card";
import { cardLink, decodeCard, encodeCard, MAX_LINK } from "@/lib/codec";
import { isReady, missingFor, mode, cardIsReady } from "@/lib/readiness";
import { cardFromProfile, clearProfile, emptyProfile, loadProfile, OLD_CARD_KEY, PROFILE_KEY, type Profile } from "@/lib/profile";
import { PACKS } from "@/lib/packs";
import { PROMPT_IDS } from "@/lib/prompts";
import { checkMatch } from "@/lib/guard";
import { buildMatchMessage } from "@/lib/match-prompt";

const base = (o: Partial<Profile>): Profile => ({ ...emptyProfile(), n: "Ken", ...o });
const t = (text: string, at = 1) => ({ text, at });

describe("readiness", () => {
  const rows: [string, Profile, boolean, number, string][] = [
    ["empty", base({}), false, 5, "quickStart"],
    ["taps only", base({ taps: { fo: [0, 0, 0, 0, 0] } }), false, 1, "topUp"],
    ["1 typed + 3 taps", base({ typed: { fd: t("a") }, taps: { fo: [0, 0, 0, null, null] } }), false, 1, "topUp"],
    ["1 typed + 4 taps", base({ typed: { fd: t("a") }, taps: { fo: [0, 0, 0, 0, null] } }), true, 0, "ready"],
    ["5 typed", base({ typed: { fd: t("a"), mk: t("b"), wd: t("c"), vs: t("d"), sg: t("e") } }), true, 0, "ready"],
    ["no name", base({ n: "", typed: { fd: t("a"), mk: t("b"), wd: t("c"), vs: t("d"), sg: t("e") } }), false, 0, "topUp"],
  ];
  for (const [name, p, ready, missing, m] of rows)
    it(name, () => {
      expect(isReady(p)).toBe(ready);
      expect(missingFor(p)).toBe(missing);
      expect(mode(p)).toBe(m);
    });
});

describe("profile", () => {
  beforeEach(() => window.localStorage.clear());
  it("migrates the old card and removes the old key", () => {
    const old = createCard({ id: "kenaaaa1", n: "Ken", c: "Econ", a: [["fd", "rendang"], ["hm", "Jakarta"], ["us", "juggle"], ["sg", "ABBA"], ["ob", "bakeries"]], p: { fo: [0, 1, 2, 0, 1] } });
    window.localStorage.setItem(OLD_CARD_KEY, JSON.stringify(old));
    const p = loadProfile();
    expect(p.id).toBe("kenaaaa1");
    expect(p.n).toBe("Ken");
    expect(p.c).toBe("Econ");
    expect(p.typed.fd?.text).toBe("rendang");
    expect(p.taps.fo).toEqual([0, 1, 2, 0, 1]);
    expect(window.localStorage.getItem(OLD_CARD_KEY)).toBeNull();
    expect(window.localStorage.getItem(PROFILE_KEY)).not.toBeNull();
  });
  it("Clear my circle deletes it", () => {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(base({ id: "abcdefgh" })));
    clearProfile();
    expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull();
  });
});

describe("card snapshot", () => {
  const typed: Profile["typed"] = {};
  PROMPT_IDS.forEach((id, i) => (typed[id] = t("w".repeat(60), i)));
  it("picks the 6 most recent typed answers, newest first", () => {
    const c = cardFromProfile(base({ typed: { fd: t("a", 1), mk: t("b", 2), wd: t("c", 3), vs: t("d", 4), sg: t("e", 5), ln: t("f", 6), jb: t("g", 7) } }))!;
    expect(c.a.map(([id]) => id)).toEqual(["jb", "ln", "sg", "vs", "wd", "mk"]);
  });
  it("gives a fresh 48h expiry each time", () => {
    const p = base({ typed: { fd: t("a") }, taps: { fo: [0, 0, 0, 0, null] } });
    expect(cardFromProfile(p, 1_000_000_000_000)!.e).toBe(1_000_000_000 + 48 * 3600);
  });
  it("a full circle at max length fits in 800 characters", () => {
    const taps: Profile["taps"] = {};
    PACKS.forEach((pk) => (taps[pk.id] = [0, 0, 0, 0, 0]));
    const c = cardFromProfile(base({ n: "Maximiliana-Josefine", c: "x".repeat(40), typed, taps }), Date.now(), "https://venn.lovable.app")!;
    expect(cardLink(c, "https://venn.lovable.app").length).toBeLessThanOrEqual(MAX_LINK);
    expect(c.a.length).toBeGreaterThanOrEqual(1);
  });
  it("an old 5-answer link still decodes", () => {
    const old = createCard({ n: "Amara", c: "", a: [["fd", "a"], ["hm", "b"], ["us", "c"], ["sg", "d"], ["ob", "e"]] });
    expect(decodeCard(encodeCard(old)).ok).toBe(true);
  });
});

describe("server readiness + guard ranges", () => {
  it("0 typed fails, 1 typed + 4 taps passes", () => {
    expect(cardIsReady({ ...createCard({ n: "A", c: "", a: [["fd", "x"]] }), a: [] })).toBe(false);
    expect(cardIsReady(createCard({ n: "A", c: "", a: [["fd", "x"]], p: { fo: [0, 0, 0, 0, null] } }))).toBe(true);
  });
  it("a 2-typed card never accepts A3, and the prompt states real ranges and themes", () => {
    const a = createCard({ n: "Ken", c: "", a: [["fd", "rendang stall"], ["us", "juggle oranges"]], p: { fo: [0, 0, 0, 0, 0] } });
    const b = createCard({ n: "Amara", c: "", a: [["hm", "Lagos traffic"]], p: { fo: [0, 0, 0, 0, 0] } });
    const r = { a: { answer_id: "A3", quote: "x" }, b: { answer_id: "B1", quote: "Lagos" } };
    const out = checkMatch({ readings: [], kind: "overlap", headline: "h", detail: "d", link: r, starters: [], challenge: { text: "c", ...r } }, a, b);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.problems.join(" ")).toContain("A1-A2");
    const msg = buildMatchMessage(a, b, 0, []);
    expect(msg).toContain("A1–A2 for Ken, B1 for Amara");
    expect(msg).toContain("A2 [Weekends · A skill that's useless but impressive]");
  });
});
