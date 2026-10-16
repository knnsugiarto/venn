// The prompt deck. IDs are part of the QR link format: never reuse an ID for a
// different question — add a new ID instead, or old cards would change meaning.
export const PROMPTS = [
  { id: "fd", text: "A food from home you'd queue an hour for", placeholder: "Hot pot with far too much chilli", short: "food from home", topic: "food from home" },
  { id: "ob", text: "Something you got weirdly obsessed with this year", placeholder: "Ranking every bakery on my bus route", short: "weird obsession", topic: "latest obsession" },
  { id: "us", text: "A skill that's useless but impressive", placeholder: "I can whistle with two fingers", short: "useless skill", topic: "useless-but-impressive skill" },
  { id: "hm", text: "Where you grew up, and one thing only locals know", placeholder: "Bristol: never trust the first chippy", short: "hometown", topic: "hometown secret" },
  { id: "wd", text: "Your perfect free Wednesday afternoon in London", placeholder: "Free museum, then dumplings in Chinatown", short: "perfect Wednesday", topic: "perfect Wednesday" },
  { id: "sg", text: "A song that gets you dancing, no matter what", placeholder: "Dancing Queen, every single time", short: "dance song", topic: "dance song" },
  { id: "op", text: "A tiny opinion you'll defend forever", placeholder: "Toast should be cut into triangles", short: "tiny opinion", topic: "tiny opinion" },
  { id: "mk", text: "The last thing you made, fixed or cooked from scratch", placeholder: "A wonky birthday cake that somehow worked", short: "last thing made", topic: "last thing made" },
  { id: "vs", text: "Where you'd take a friend visiting London", placeholder: "Primrose Hill at sunset", short: "London tip", topic: "London tip" },
  { id: "rc", text: "A show, game or book you make everyone try", placeholder: "Outer Wilds. Go in blind.", short: "recommendation", topic: "recommendation" },
  { id: "jb", text: "The strangest job or chore you've ever had", placeholder: "Dressed as a giant carrot at a market", short: "strangest job", topic: "strangest job" },
  { id: "ln", text: "Something you want to learn before you graduate", placeholder: "Fresh pasta by hand", short: "thing to learn", topic: "thing to learn" },
] as const;

export type PromptId = (typeof PROMPTS)[number]["id"];
export const PROMPT_IDS = PROMPTS.map((p) => p.id) as [PromptId, ...PromptId[]];

export function getPrompt(id: PromptId) {
  const prompt = PROMPTS.find((p) => p.id === id);
  if (!prompt) throw new Error("Unknown prompt");
  return prompt;
}

/** Picks n distinct random prompt IDs, optionally excluding some. */
export function randomPrompts(n: number, exclude: PromptId[] = []): PromptId[] {
  const pool = PROMPT_IDS.filter((id) => !exclude.includes(id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i];
    const other = pool[j];
    if (t === undefined || other === undefined) continue;
    pool[i] = other;
    pool[j] = t;
  }
  return pool.slice(0, n);
}
