import { createCard, type Card } from "../src/lib/card";
import type { PromptId } from "../src/lib/prompts";
import type { VennResult } from "../src/lib/match-schema";

type Kind = VennResult["readings"][number]["kind"];
export type ContextPair = { id: number; a: Card; b: Card; expected: Record<string, Kind[]>; review: string };
export function contextPairs(): ContextPair[] {
  const rows: [PromptId, string, PromptId, string, Kind[], Kind[], string][] = [
    ["fd", "carbonara", "mk", "my nonna's lasagne", ["food"], ["food"], "Italian pasta overlap"],
    ["fd", "Robert Pattinson", "rc", "Twilight on repeat", ["person"], ["screen"], "Twilight link despite food-question joke"],
    ["fd", "nasi goreng", "fd", "egg fried rice at 2am", ["food"], ["food"], "Fried rice"],
    ["ob", "footy every Sunday", "ob", "Arsenal home games", ["sport"], ["sport"], "Football"],
    ["vs", "the Globe", "ln", "Hamlet in Year 10", ["place"], ["book", "screen", "activity"], "Theatre / Shakespeare"],
    ["fd", "ramenn", "fd", "tonkotsu ramen", ["food"], ["food"], "Misspelling recognised"],
    ["fd", "Brezeln vom Markt", "fd", "pretzels", ["food"], ["food"], "German pretzels"],
    ["rc", "Zorblax 3", "rc", "Outer Wilds", ["unknown"], ["game"], "Never base main link on Zorblax 3"],
    ["sg", "my friend Tom's band", "sg", "Arctic Monkeys", ["music"], ["music"], "No invented facts about Tom"],
    ["sg", "Taylor Swift", "rc", "the Eras Tour film", ["music", "person"], ["music", "screen"], "Eras Tour link"],
  ];
  return rows.map(([pa, ta, pb, tb, ka, kb, review], i) => ({
    id: i + 1,
    a: createCard({ id: `evala${String(i).padStart(3, "0")}`, n: "Sam", c: "", a: [[pa, ta], ["us", "juggle oranges"], ["op", "Triangles make better toast"], ["wd", "Museum then a long walk"], ["jb", "Sorting theatre costumes"]] }),
    b: createCard({ id: `evalb${String(i).padStart(3, "0")}`, n: "Priya", c: "", a: [[pb, tb], ["us", "Two-finger whistle"], ["op", "Rectangles make better toast"], ["wd", "Walk then a museum"], ["jb", "Painting theatre scenery"]] }),
    expected: { A1: ka, B1: kb }, review,
  }));
}
