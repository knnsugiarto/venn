import type { PromptId } from "./prompts";

// Themes (pack IDs): 5 tap questions plus 1-2 typed prompts each. Note: prompt
// "ln" (learn) and pack "ln" (London life) share letters; they live in different
// parts of the link, so nothing clashes. Never rename either.
// Theme packs: optional, tap-only questions. IDs, question numbers and option
// positions are part of the link format — never change what they mean. To change
// content, add a new question or pack instead.
export type PackId = "fo" | "ln" | "ms" | "st" | "wk" | "sc" | "tp" | "tv";
export type Pack = { id: PackId; name: string; icon: string; prompts: readonly PromptId[]; questions: { q: string; options: string[] }[] };
export type PackAnswers = (number | null)[];
export type Packs = Partial<Record<PackId, PackAnswers>>;

const q = (text: string, options: string[]) => ({ q: text, options });

export const PACKS: readonly Pack[] = [
  { id: "fo", name: "Food", icon: "UtensilsCrossed", prompts: ["fd", "mk"], questions: [
    q("Breakfast?", ["Sweet", "Savoury", "Skip it", "Whatever's left"]),
    q("Spice level?", ["Mild please", "Medium", "Make me cry"]),
    q("Late-night snack?", ["Instant noodles", "Toast", "Fruit", "Something fried"]),
    q("Tea or coffee?", ["Tea", "Coffee", "Both", "Neither"]),
    q("In the kitchen you…", ["Follow the recipe", "Cook on vibes", "Master the microwave", "Let someone else cook"]),
  ] },
  { id: "ln", name: "London life", icon: "TrainFront", prompts: ["wd", "vs"], questions: [
    q("Getting around?", ["Tube", "Top deck of the bus", "Walk everywhere", "Cycle"]),
    q("Best free thing in London?", ["Museums", "Parks", "Markets", "Just wandering"]),
    q("Rainy-day plan?", ["Museum", "Café", "Pretend it's not raining", "Stay in"]),
    q("Saturday morning?", ["Market", "Lie-in", "Gym", "Gallery"]),
    q("Touristy thing you secretly love?", ["South Bank", "Camden", "Big Ben", "Haven't done any yet"]),
  ] },
  { id: "ms", name: "Music", icon: "Music", prompts: ["sg"], questions: [
    q("Headphones on?", ["Always", "Sometimes", "Rarely"]),
    q("Live music?", ["Small gigs", "Big festivals", "My bedroom is the venue"]),
    q("On repeat right now?", ["Pop", "Hip-hop and rap", "Rock and indie", "Electronic", "Something else"]),
    q("Karaoke?", ["First up", "After some persuading", "Never ever"]),
    q("Shower singing?", ["Full concert", "Humming", "Silence"]),
  ] },
  { id: "st", name: "Study & work", icon: "BookOpen", prompts: ["ln", "jb"], questions: [
    q("Best time to focus?", ["Early bird", "Afternoon", "Night owl"]),
    q("Where?", ["Silent library", "Busy café", "In bed", "Wherever's free"]),
    q("Deadlines?", ["Done early", "Steady pace", "The night before"]),
    q("In group projects you're…", ["The leader", "The ideas person", "Quietly doing the work", "In charge of snacks"]),
    q("Study soundtrack?", ["Silence", "Lo-fi", "Songs with lyrics", "Rain sounds"]),
  ] },
  { id: "wk", name: "Weekends", icon: "Sun", prompts: ["ob", "us"], questions: [
    q("Plans?", ["Packed", "One thing", "Absolutely nothing"]),
    q("Indoors or out?", ["Outdoors", "Indoors", "Depends on the weather"]),
    q("Ideal Sunday?", ["Long walk", "Big brunch", "Gaming", "Making something"]),
    q("Spontaneous trip?", ["Yes, let's go", "Give me a week's notice", "I'll see the photos"]),
    q("New hobbies?", ["Try everything", "One deep obsession", "Comfort zone, thanks"]),
  ] },
  { id: "sc", name: "Screens & stories", icon: "Clapperboard", prompts: ["rc"], questions: [
    q("Film night?", ["Comedy", "Horror", "Animation", "Documentary"]),
    q("Rewatch or new?", ["Rewatch my comfort show", "Always something new"]),
    q("Books?", ["Paper", "E-reader", "Audiobook", "Not my thing"]),
    q("Games?", ["Phone", "Console", "PC", "Board games", "Not really"]),
    q("Spoilers?", ["Fine by me", "Absolutely not"]),
  ] },
  { id: "tp", name: "Tiny opinions", icon: "Scale", prompts: ["op"], questions: [
    q("Toast?", ["Triangles", "Rectangles"]),
    q("Pineapple on pizza?", ["Yes", "No", "Only ironically"]),
    q("Window or aisle?", ["Window", "Aisle"]),
    q("Cereal or milk first?", ["Cereal first", "Milk first", "Don't do cereal"]),
    q("Best biscuit for tea?", ["Digestive", "Custard cream", "Hobnob", "Not a dunker"]),
  ] },
  { id: "tv", name: "Travel", icon: "Plane", prompts: ["hm"], questions: [
    q("Holiday type?", ["Beach", "City", "Mountains", "Road trip"]),
    q("Packing?", ["Week before", "Night before", "An hour before"]),
    q("Planning?", ["Every hour planned", "Rough idea", "No plan at all"]),
    q("Souvenir?", ["Fridge magnet", "Snacks", "Photos", "Nothing"]),
    q("Dream next trip?", ["Somewhere hot", "Somewhere cold", "Anywhere with good food"]),
  ] },
];

export const PACK_IDS = PACKS.map((p) => p.id);

export function isPackId(id: string): id is PackId {
  return (PACK_IDS as string[]).includes(id);
}

export function getPack(id: PackId): Pack {
  return PACKS.find((p) => p.id === id)!;
}

export function packAnswerLabel(packId: PackId, qIndex: number, option: number): string {
  const label = PACKS.find((p) => p.id === packId)?.questions[qIndex]?.options[option];
  if (label === undefined) throw new Error(`Unknown pack answer ${packId}/${qIndex}/${option}`);
  return label;
}

/** Drops packs with every answer skipped; returns undefined when nothing is left. */
export function cleanPacks(p: Packs | undefined): Packs | undefined {
  if (!p) return undefined;
  const out: Packs = {};
  for (const id of PACK_IDS) {
    const a = p[id];
    if (a && a.some((x) => x !== null)) out[id] = a;
  }
  return Object.keys(out).length ? out : undefined;
}

export function packCount(p: Packs | undefined): number {
  return Object.keys(cleanPacks(p) ?? {}).length;
}

export function nextUnadded(p: Packs | undefined, after?: PackId): Pack | null {
  const start = after ? PACK_IDS.indexOf(after) + 1 : 0;
  const order = [...PACKS.slice(start), ...PACKS.slice(0, start)];
  return order.find((pk) => pk.id !== after && !p?.[pk.id]) ?? null;
}

export function themeOfPrompt(id: PromptId): Pack {
  return PACKS.find((p) => p.prompts.includes(id))!;
}
