import { answerList } from "@/lib/answers";
import { describe, expect, it } from "vitest";
import { createCard, CardSchema, nowSeconds, type Card } from "@/lib/card";
import { cardLink, decodeCard, encodeCard, MAX_LINK } from "@/lib/codec";
import { checkMatch } from "@/lib/guard";
import { demoMatch } from "@/lib/demo-match";
import type { VennResult } from "@/lib/match-schema";

const ken: Card = createCard({ id: "kenaaaa1", n: "Ken", c: "Economics", a: [["hm", "Jakarta: traffic is a lifestyle"], ["fd", "Mum's rendang"], ["us", "I can juggle three oranges"], ["sg", "Anything ABBA"], ["ob", "Ranking bakeries on my bus route"]] });
const amara: Card = createCard({ id: "amaraaa2", n: "Amara", c: "", a: [["hm", "Lagos traffic builds character"], ["jb", "Giant carrot costume at a market"], ["op", "Toast must be triangles"], ["rc", "Outer Wilds. Go in blind."], ["ln", "Fresh pasta by hand"]] });

describe("card + link", () => {
  it("round-trips through the link", () => {
    const r = decodeCard(encodeCard(ken));
    expect(r.ok && r.card).toEqual(ken);
  });
  it("a card with all answers at 60 chars fits in 800 characters", () => {
    const long = createCard({ n: "Maximiliana-Josefine", c: "x".repeat(40), a: (["fd", "ob", "us", "hm", "wd"] as const).map((p) => [p, "w".repeat(60)]) });
    expect(cardLink(long, "https://venn.lovable.app").length).toBeLessThanOrEqual(MAX_LINK);
  });
  it("rejects an expired card", () => {
    expect(decodeCard(encodeCard({ ...ken, e: nowSeconds() - 1 }))).toEqual({ ok: false, reason: "expired" });
  });
  it("rejects expiry more than 49 hours ahead", () => {
    expect(CardSchema.safeParse({ ...ken, e: nowSeconds() + 50 * 3600 }).success).toBe(false);
  });
  it("rejects a card with 0 or 7 typed answers", () => {
    expect(CardSchema.safeParse({ ...ken, a: [] }).success).toBe(false);
    expect(CardSchema.safeParse({ ...ken, a: [...ken.a, ["jb", "x"], ["rc", "y"]] }).success).toBe(false);
  });
  it("rejects garbage links", () => {
    expect(decodeCard("1abc").ok).toBe(false);
    expect(decodeCard("x".repeat(1600)).ok).toBe(false);
  });
});

const good: VennResult = {
  readings: [...answerList(ken, "A"), ...answerList(amara, "B")].map(x => ({ answer_id: x.id, kind: "other", gloss: "A real answer" })),
  kind: "overlap",
  headline: "You both grew up in cities famous for traffic",
  detail: "Jakarta and Lagos, two legendary commutes.",
  link: { a: { answer_id: "A1", quote: "Jakarta" }, b: { answer_id: "B1", quote: "Lagos traffic" } },
  starters: [
    { text: "Whose worst commute story wins?", a: { answer_id: "A1", quote: "traffic is a lifestyle" }, b: { answer_id: "B1", quote: "builds character" } },
    { text: "Ken, could you juggle in a carrot costume?", a: { answer_id: "A3", quote: "juggle three oranges" }, b: { answer_id: "B2", quote: "Giant carrot costume" } },
    { text: "Would ABBA help in Outer Wilds?", a: { answer_id: "A4", quote: "ABBA" }, b: { answer_id: "B4", quote: "Outer Wilds" } },
  ],
  challenge: { text: "Teach each other a skill in two minutes.", a: { answer_id: "A3", quote: "juggle" }, b: { answer_id: "B5", quote: "pasta" } },
};

describe("guard", () => {
  it("accepts real quotes", () => expect(checkMatch(good, ken, amara).ok).toBe(true));
  it("rejects a made-up quote", () => {
    const bad = { ...good, link: { ...good.link, b: { answer_id: "B1", quote: "Lagos noodles" } } };
    expect(checkMatch(bad, ken, amara).ok).toBe(false);
  });
  it("rejects a quote over 6 words", () => {
    const bad = { ...good, link: { ...good.link, b: { answer_id: "B2", quote: "Giant carrot costume at a market" } } };
    expect(checkMatch({ ...bad, link: { ...bad.link, b: { answer_id: "B4", quote: "Outer Wilds. Go in blind. x" } } }, ken, amara).ok).toBe(false);
  });
  it("rejects a reference to the wrong person", () => {
    expect(checkMatch({ ...good, link: { ...good.link, a: { answer_id: "B1", quote: "Lagos" } } }, ken, amara).ok).toBe(false);
  });
  it("rejects percentages and compatibility", () => {
    expect(checkMatch({ ...good, headline: "You are 87% alike" }, ken, amara).ok).toBe(false);
    expect(checkMatch({ ...good, detail: "Great compatibility here." }, ken, amara).ok).toBe(false);
  });
  it("needs 3 valid starters", () => {
    expect(checkMatch({ ...good, starters: good.starters.slice(0, 2) }, ken, amara).ok).toBe(false);
  });
  it("rejects starters already shown", () => {
    expect(checkMatch(good, ken, amara, [good.starters[0]!.text]).ok).toBe(false);
  });
});

describe("demo matcher", () => {
  it("finds a shared word as an overlap", () => {
    const r = demoMatch(ken, amara, 0);
    expect(r.kind).toBe("overlap");
    expect(r.headline.toLowerCase()).toContain("traffic");
  });
  it("passes the guard for every variant", () => {
    for (let v = 0; v < 10; v++) expect(checkMatch(demoMatch(ken, amara, v), ken, amara).ok).toBe(true);
  });
  it("is deterministic", () => expect(demoMatch(ken, amara, 2)).toEqual(demoMatch(ken, amara, 2)));
});
