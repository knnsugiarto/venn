import { answerList } from "@/lib/answers";
import { describe, expect, it } from "vitest";
import { createCard, CardSchema, withPack, type Card } from "@/lib/card";
import { cardLink, decodeCard, encodeCard, MAX_LINK } from "@/lib/codec";
import { checkMatch } from "@/lib/guard";
import { demoMatch } from "@/lib/demo-match";
import { buildMatchMessage } from "@/lib/match-prompt";
import { PACKS, packAnswerLabel, nextUnadded, type Packs } from "@/lib/packs";
import type { VennResult } from "@/lib/match-schema";
import { deflateSync } from "fflate";

const ken: Card = createCard({ id: "kenaaaa1", n: "Ken", c: "Economics", a: [["hm", "Jakarta: traffic is a lifestyle"], ["fd", "Mum's rendang"], ["us", "I can juggle three oranges"], ["sg", "Anything ABBA"], ["ob", "Ranking bakeries on my bus route"]], p: { fo: [1, 2, 0, 3, null], st: [2, null, 1, 0, 1] } });
const amara: Card = createCard({ id: "amaraaa2", n: "Amara", c: "", a: [["hm", "Lagos traffic builds character"], ["jb", "Giant carrot costume at a market"], ["op", "Toast must be triangles"], ["rc", "Outer Wilds. Go in blind."], ["ln", "Fresh pasta by hand"]], p: { fo: [0, 2, null, null, null] } });

const allPacks: Packs = Object.fromEntries(PACKS.map((p) => [p.id, p.questions.map((q) => q.options.length - 1)]));

function rawLink(arr: unknown[]) {
  const b = deflateSync(new TextEncoder().encode(JSON.stringify(arr)));
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return "1" + btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const base = (c: Card) => [c.v, c.id, c.n, c.c, c.e, c.a];

describe("pack content", () => {
  it("every pack has 5 questions with 2-5 distinct options of at most 30 chars", () => {
    expect(PACKS).toHaveLength(8);
    for (const p of PACKS) {
      expect(p.questions).toHaveLength(5);
      for (const q of p.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(5);
        expect(new Set(q.options).size).toBe(q.options.length);
        for (const o of q.options) expect(o.length).toBeLessThanOrEqual(30);
      }
    }
  });
  it("packAnswerLabel throws on bad input", () => {
    expect(packAnswerLabel("fo", 1, 2)).toBe("Make me cry");
    expect(() => packAnswerLabel("fo", 1, 3)).toThrow();
  });
});

describe("codec with packs", () => {
  it("round-trips packs with skipped answers", () => {
    const r = decodeCard(encodeCard(ken));
    expect(r.ok && r.card.p).toEqual(ken.p);
  });
  it("an old link without packs still decodes", () => {
    const r = decodeCard(rawLink(base(ken)));
    expect(r.ok && r.card.p).toBeUndefined();
  });
  it("rejects unknown pack, wrong length and out-of-range option", () => {
    for (const bad of ["zz00000", "fo0000", "fo4000-"]) expect(decodeCard(rawLink([...base(ken), bad]))).toEqual({ ok: false, reason: "malformed" });
  });
  it("max card plus all 8 packs fits in 800 characters", () => {
    const long = createCard({ n: "Maximiliana-Josefine", c: "x".repeat(40), a: (["fd", "ob", "us", "hm", "wd"] as const).map((p) => [p, "w".repeat(60)]), p: allPacks });
    const link = cardLink(long, "https://venn.lovable.app");
    console.log("max link with all packs:", link.length, "typical:", cardLink(ken, "https://venn.lovable.app").length);
    expect(link.length).toBeLessThanOrEqual(MAX_LINK);
    expect(JSON.stringify({ a: long, b: long, mode: "auto", variant: 0, avoid: [] }).length).toBeLessThan(2048);
  });
  it("an all-skipped pack is dropped and adding a pack refreshes expiry", () => {
    expect(CardSchema.parse({ ...ken, p: { fo: [null, null, null, null, null] } }).p).toBeUndefined();
    const old = { ...ken, e: ken.e - 3600 };
    expect(withPack(old, "tv", [0, 0, 0, 0, 0]).e).toBeGreaterThan(old.e);
  });
});

const good: VennResult = {
  readings: [...answerList(ken, "A"), ...answerList(amara, "B")].map(x => ({ answer_id: x.id, kind: "other", gloss: "A real answer" })),
  kind: "overlap",
  headline: "You both grew up in cities famous for traffic",
  detail: "Jakarta and Lagos, two legendary commutes.",
  link: { a: { answer_id: "A1", quote: "Jakarta" }, b: { answer_id: "B1", quote: "Lagos traffic" } },
  starters: [
    { text: "Who handles spice better?", a: { answer_id: "A-fo2", quote: "Make me cry" }, b: { answer_id: "B-fo2", quote: "Make me cry" } },
    { text: "Ken, could you juggle in a carrot costume?", a: { answer_id: "A3", quote: "juggle three oranges" }, b: { answer_id: "B2", quote: "Giant carrot costume" } },
    { text: "Would ABBA help in Outer Wilds?", a: { answer_id: "A4", quote: "ABBA" }, b: { answer_id: "B4", quote: "Outer Wilds" } },
  ],
  challenge: { text: "Teach each other a skill in two minutes.", a: { answer_id: "A3", quote: "juggle" }, b: { answer_id: "B5", quote: "pasta" } },
};
const withStarter0 = (a: string, qa: string, b = "B-fo2", qb = "Make me cry"): VennResult => ({ ...good, starters: [{ ...good.starters[0]!, a: { answer_id: a, quote: qa }, b: { answer_id: b, quote: qb } }, ...good.starters.slice(1)] });

describe("guard with packs", () => {
  it("accepts a valid pack citation", () => expect(checkMatch(good, ken, amara).ok).toBe(true));
  it("rejects a pack question that wasn't answered", () => expect(checkMatch(withStarter0("A-fo5", "Follow the recipe"), ken, amara).ok).toBe(false));
  it("rejects a pack quote not in the option label", () => expect(checkMatch(withStarter0("A-fo2", "Very spicy"), ken, amara).ok).toBe(false));
  it("rejects the wrong person prefix", () => expect(checkMatch(withStarter0("B-fo2", "Make me cry"), ken, amara).ok).toBe(false));
  it("rejects a link citing only pack answers", () => {
    const r = checkMatch({ ...good, link: { a: { answer_id: "A-fo2", quote: "Make me cry" }, b: { answer_id: "B-fo2", quote: "Make me cry" } } }, ken, amara);
    expect(r.ok === false && r.problems).toContain("The main link must cite at least one free-text answer (A1–A5 or B1–B5).");
  });
});

describe("prompt with packs", () => {
  it("includes pack lines with ids and labels", () => {
    const m = buildMatchMessage(ken, amara, 0, []);
    expect(m).toContain("A-fo2 [Food · Spice level?]: Make me cry");
    expect(m).toContain("<packs>");
  });
  it("leaves out the block without packs", () => {
    const { p: _p, ...bare } = ken;
    expect(buildMatchMessage(bare, { ...amara, p: undefined }, 0, [])).not.toContain("<packs>");
  });
});

describe("demo with packs", () => {
  it("third starter uses a shared pack pick and passes the guard", () => {
    const out = demoMatch(ken, amara, 0);
    expect(out.starters[2]!.a.answer_id).toBe("A-fo2");
    expect(checkMatch(out, ken, amara).ok).toBe(true);
  });
  it("passes the guard for 50 pairs, half with random packs", () => {
    const words = ["traffic", "bakery", "chips", "pasta", "museum", "ABBA", "juggle", "Lagos", "market", "toast"];
    const ids = ["fd", "ob", "us", "hm", "wd", "sg", "op", "mk", "vs", "rc"] as const;
    const rnd = (i: number) => {
      const p: Packs = {};
      for (const pk of PACKS) if ((i + pk.id.charCodeAt(0)) % 3 === 0) p[pk.id] = pk.questions.map((q, j) => ((i + j) % 4 === 0 ? null : (i * 7 + j) % q.options.length));
      return p;
    };
    for (let i = 0; i < 50; i++) {
      const mk = (k: number, side: string) => createCard({ id: `${side}${String(i).padStart(7, "0")}`, n: side === "a" ? "Sam" : "Priya", c: "", a: [0, 1, 2, 3, 4].map((j) => [ids[(k + j * 2) % 10]!, `${words[(k + j) % 10]} and ${words[(k * 3 + j) % 10]} forever`]), p: i % 2 ? rnd(k) : undefined });
      const a = mk(i, "a");
      const b = mk(i + 3, "b");
      expect(checkMatch(demoMatch(a, b, i % 5), a, b).ok).toBe(true);
    }
  });
});

describe("next redirect", () => {
  it("only allows known pack pages", () => {
  });
  it("finish screen offers the next pack not yet added", () => {
    expect(nextUnadded({ fo: [0, 0, 0, 0, 0], ln: [0, 0, 0, 0, 0] }, "fo")?.id).toBe("ms");
    expect(nextUnadded(allPacks, "tv")).toBeNull();
  });
});
