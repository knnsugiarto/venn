# Venn add-on: Open questions, smarter reading, minimal landing

> **For the team: what's in here, and where to run it**
>
> | Part | What it does | Where | Agent time |
> |---|---|---|---|
> | **1** | New example answers (no more "jollof from my aunt's stall") | `main` | ~15 min |
> | **2** | Minimal landing page: "venn", one line, Start. No sign-in. | `main` | ~30 min |
> | **3** | Claude reads answers in context: pasta is food, Robert Pattinson is an actor | `main` | ~1–1.5 h |
> | **4** | Every question becomes open-ended; themes get 4 typed questions each | branch only | ~1.5 h |
>
> - **Parts 1–3 make the judging demo better.** Part 3 is your best answer to "why does this need AI?". Do them first.
> - **Part 4** reshapes data the night before the demo. It runs on the `feat/your-circle` branch with the same **hard stop: merged and phone-tested by Friday 10:00 London, or dropped.**
> - Paste this into the same coding-agent session as before.

---

## 0. Before you start (agent)

1. **Check the gate:** the core scan-to-Venn flow works on the production URL and all tests pass. If not, stop, tell the human, and fix that first.
2. **Precedence:** where documents disagree, this file wins, then `docs/ADDON-your-circle.md`, then `docs/ADDON-theme-packs.md`, then `docs/SPEC.md`.
3. Save this file as `docs/ADDON-open-questions.md`.
4. **Parts 1–3:**
   - Work on a short-lived branch `feat/smarter-reading`.
   - Push it, and ask the human to check the Vercel preview URL on one phone.
   - Merge to `main` as soon as all checks pass. Don't wait for Part 4.
5. **Part 4:**
   - Work on `feat/your-circle` if it exists. If it doesn't, create `feat/open-questions` from `main`.
   - Never merge Part 4 to `main` until section 4.9's "done" list is complete.

---

## Part 1: Example answers (`main`)

**The problem:** the same example ("Jollof from my aunt's stall", "My nan's jollof…") appears on several screens. It reads as a cliché and makes every card look alike.

**What to do:**
1. Search the whole codebase, case-insensitively, for `jollof`, `aunt` and `nan's`. Remove every occurrence from user-facing text: placeholders, hints, microcopy, the README and the OG image. Test fixtures may keep foods, but not these phrases.
2. **The builder hint** (first question only) becomes: **"Be specific: a name, a place, a detail."** It contains no example answer.
3. **Every prompt gets its own placeholder.** Use the list in section 4.2. On `main`, take only the rows for the 12 existing prompt IDs (`fd mk wd vs sg ln jb ob us rc op hm`); the other 20 arrive with Part 4. Rules:
   - No placeholder text appears on more than one prompt.
   - No placeholder relies on family members or stereotypes, or on a single culture's food as "the" example.
4. **Placeholders are hints, not defaults.** Render them in ink-soft and never submit them as answers. An empty input stays empty.
5. **Test:** add a unit test that every prompt has a non-empty placeholder, that all placeholders are unique, and that none contains "jollof", "aunt" or "nan's".

---

## Part 2: Minimal landing page (`main`)

**When it shows:** at `/`, only when the phone has **no** card or profile.
- Returning users go straight to their home (code + circle).
- Someone opening a scanned link (`/v#…`) with no data skips the landing and goes straight to the quick start, as now.

```
┌──────────────────────────────┐
│                              │
│                              │
│                              │
│            ◯◐◯               │  ← logo mark, ~96px, idle float
│            venn              │  ← Fraunces 600, 64px, ink
│                              │
│     Skip the small talk.     │  ← Inter 18px, ink-soft
│  Make a card. Scan someone.  │  ← optional second line, Inter 15px, ink-soft
│            Talk.             │
│                              │
│                              │
│ [           Start          ] │  ← the only button; sticky bottom
│           Privacy            │  ← tiny text link
└──────────────────────────────┘
```

**Rules:**
- **On the page:** the logo, the word "venn", **at most two short lines**, one button, and a tiny Privacy link.
- **Not on the page:** step lists, feature lists, theme grids, screenshots, testimonials, or sign-in, email or account fields. Say it plainly in code comments: **there is no sign-in, by design.**
- **Layout:** everything centred vertically in the space above the button. Paper background. One idle animation only: the circles drift ±3px, switched off under reduced motion.
- **"Start"** opens the quick start (5 questions, then the first name), then the user's home with their code.
- **Returning-user home** (code + circle) is also minimal: name and circle, the QR with "Show my code", then "Fill your circle" as a **plain list** of theme rows (theme name, "2 of 4", chevron), not a tile grid. Nothing else except "Clear my circle" at the very bottom.
- **Test:** a component test. With empty storage, `/` renders exactly one button ("Start") and no form fields. With a stored card, `/` renders the home instead.

---

## Part 3: Claude reads answers in context (`main`)

**Goal:** Claude understands *what each answer is* before it looks for links.
- "Pasta" and "my nonna's lasagne" are both food (Italian pasta).
- "Robert Pattinson" is a person, an actor, even if someone typed him as their answer to the food question as a joke.
- "Twilight on repeat" connects to "Robert Pattinson".
- "The Globe" in a London question is a theatre, not a world map.

This is also the clearest demo of why Venn needs Claude, so it's visible to users in the receipts.

### 3.1 System prompt: add this section before "Rules" in `match-prompt.ts`

```
How to read answers (do this first, before looking for any link):
- Work out what each answer actually is: a food or drink, a person, a place, a film, show, book or game, music or an artist, a sport, an activity, a skill, an object, an idea, or something else.
- Use the question as context, but trust the answer itself. If someone answers a food question with "Robert Pattinson", that's a person (an actor), probably a joke, and you can enjoy the joke.
- Recognise well-known names and things, slang, abbreviations, misspellings and other languages: "carbonara" is a pasta dish; "nasi goreng" is Indonesian fried rice; "footy" is football; "Robert Pattinson" is an actor known for Twilight and The Batman.
- Link at the level of meaning, not matching words: "carbonara" and "my nonna's lasagne" are both Italian pasta; "Robert Pattinson" and "Twilight on repeat" are the same franchise. Ambiguous words take their meaning from context: "Jaguar" answering a car question is a car.
- Only use facts you are sure of and that are widely known. If you don't recognise something, say "not sure what this is" in its reading and don't build on a guess.
- For well-known public figures, you may say who they are and what they're famous for. Never comment on anyone's private life, looks or anything sensitive. Never state facts about private people (friends, family, teachers, "my mate Tom").
```

### 3.2 Output schema: `readings` comes FIRST

Add `readings` as the **first** property of `ModelMatchSchema`. With structured outputs, Claude writes properties in schema order, so it interprets each answer before choosing the link.

```ts
const READING_KINDS = ["food", "drink", "person", "place", "screen", "book", "music", "game",
  "sport", "activity", "skill", "object", "idea", "other", "unknown"] as const;

const Reading = z.object({
  answer_id: z.string(),
  kind: z.enum(READING_KINDS),
  gloss: z.string().describe("At most 10 words: what this is. E.g. 'an actor, known for Twilight and The Batman'. Use 'not sure what this is' if unsure."),
});

// ModelMatchSchema = z.object({ readings: z.array(Reading).describe("One reading for every answer you cite, written before anything else."), kind, headline, detail, link, starters, challenge })
```

**Claude settings:** raise `max_tokens` from 900 to 1400. The readings add output. Lower-case `kind` before validating, because enum values can come back capitalised.

### 3.3 Guard: new rules in `guard.ts`

1. **Every cited answer has a reading.** Each `answer_id` cited in `link`, `starters` or `challenge` must have exactly one reading. Readings for IDs that don't exist are a problem.
2. **Gloss length:** each gloss is non-empty and at most 80 characters.
3. **Don't link on guesses:** the main link must not have `kind: "unknown"` on **both** sides.
   - Problem text: "The main link can't rest on two answers you didn't recognise."

Everything else is unchanged.

### 3.4 Receipts UI: show how Claude read each answer

- In "Show receipts", under every **cited** answer, add a small ink-soft line: **"Read as: an actor, known for Twilight and The Batman"**, using the gloss.
- No icons are needed.
- Change the receipts footer line to: "Every line above quotes something you both wrote. Our code checks each quote, and you can see how Claude read each answer."

**Demo mode:** the rule-based matcher produces readings too, with `kind: "other"` and `gloss: "read by simple rules, not Claude"`, so the UI and the guard work the same way.

### 3.5 Eval: a context test set

Add `eval/context-pairs.ts`: 10 pairs built to test understanding, each with **expected kinds** for the key answers.

| # | Person A answer (prompt) | Person B answer (prompt) | Expect |
|---|---|---|---|
| 1 | "carbonara" (`fd`) | "my nonna's lasagne" (`mk`) | Both `food`; an overlap about Italian pasta |
| 2 | "Robert Pattinson" (`fd`, a joke) | "Twilight on repeat" (`cf`) | A = `person`; a link via Twilight |
| 3 | "nasi goreng" (`fd`) | "egg fried rice at 2am" (`sn`) | Both `food`; fried rice |
| 4 | "footy every Sunday" (`sd`) | "Arsenal home games" (`hb`) | Both `sport` |
| 5 | "the Globe" (`vs`) | "Hamlet in Year 10" (`sb`) | A = `place`; theatre/Shakespeare |
| 6 | "ramenn" (`sn`, misspelt) | "tonkotsu ramen" (`br`) | Both `food` |
| 7 | "Brezeln vom Markt" (`fd`, German) | "pretzels" (`sn`) | Both `food` |
| 8 | "Zorblax 3" (`rc`, made-up) | "Outer Wilds" (`rc`) | A = `unknown`, and the link must not rest on it |
| 9 | "my friend Tom's band" (`ar`) | "Arctic Monkeys" (`ar`) | No invented facts about Tom; B = `music` |
| 10 | "Taylor Swift" (`ar`) | "the Eras Tour film" (`fl`) | Both `music`/`screen`; a link |

**Prompt IDs:** some in this table only exist once Part 4 is built. On `main`, attach those answers to the nearest existing prompt:

| Part 4 ID | Use on `main` |
|---|---|
| `cf`, `fl` | `rc` |
| `sn`, `br` | `fd` |
| `sd`, `hb` | `ob` |
| `ar` | `sg` |
| `sb` | `ln` |

The prompt only supplies context; pair 2's joke still needs `fd`.

**The script** runs each pair 3 times and reports:
- **Kind accuracy:** how often the expected kinds match.
- **Guard first-try pass rate.**
- **Median latency.**
- **Gloss review:** a "Glosses look right? (y/n)" column for the human.

**Targets:** kind accuracy ≥ 90%, pair 8 never links on "Zorblax 3", pair 9 never states a fact about Tom, median latency under 6 seconds.

If a target misses, adjust only the section 3.1 wording, then log the change in `docs/DECISIONS.md`.

### 3.6 Tests

| Area | Tests |
|---|---|
| guard | A reading missing for a cited ID fails. A reading for a non-existent ID fails. An 81-character gloss fails. Unknown + unknown on the link fails. Unknown on one side passes. |
| schema | `readings` is the first property of the JSON Schema sent to Claude. |
| demo | Demo output includes readings and still passes the guard (extend the property test). |
| receipts | The "Read as:" line renders for cited answers only. |

**Done when:**
- All tests pass and the eval targets are met (or each gap is written down).
- The human sees a "Read as:" line on the preview URL on a phone.
- Merged to `main`, with the production deploy checked.

---

## Part 4: All questions open-ended (branch only)

**The change:** no more tap or multiple-choice questions anywhere. Every question is a short typed answer, because typed answers are where Claude's understanding (Part 3) shines.

**What it costs:** filling in your circle is slower. So every theme is short (4 questions), every question can be skipped, and nothing is ever required beyond the quick start.

### 4.1 What gets removed

- **All tap questions and their code:** the tap data, `A-fo2`-style answer IDs, tap UI, tap tests, the guard's "typed vs tap" link rule (now always true) and the demo matcher's tap starter.
- **Migration:** if a stored profile or card has tap answers, drop them silently and keep the typed answers. Show one small note once on the home page: "Venn now uses open questions. Your written answers are kept." Unit-test this.
- **Old links** that contain taps must still decode (ignore the taps) until they expire.

### 4.2 The question bank (`lib/prompts.ts`): 8 themes × 4 questions = 32

- **IDs are part of the link format.** The 12 existing prompt IDs keep their meaning. There are 20 new IDs.
- **Theme IDs** reuse the old pack IDs (`fo`, `ln`, …), which never appear in links now.
- **Answers:** max 60 characters each.

| Theme | ID | Question | Placeholder |
|---|---|---|---|
| **Food** `fo` | `fd` | A food from home you'd queue an hour for | Hot pot with far too much chilli |
| | `mk` | The last thing you made, fixed or cooked from scratch | A wonky birthday cake that somehow worked |
| | `sn` | Your go-to late-night snack | Cheese toastie at 2am |
| | `br` | The best thing you've eaten in London so far | Bao from a Saturday market |
| **London life** `ln` | `wd` | Your perfect free Wednesday afternoon in London | Free museum, then dumplings in Chinatown |
| | `vs` | Where you'd take a friend visiting London | Primrose Hill at sunset |
| | `tr` | Your favourite way to get around London, and why | Top deck of the bus, front seat |
| | `sp` | A London spot you found by accident | A tiny garden behind a church |
| **Music** `ms` | `sg` | A song that gets you dancing, no matter what | Dancing Queen, every single time |
| | `ar` | An artist you'd queue overnight to see | Rosalía |
| | `gl` | A song you secretly know every word to | A 2000s boy-band hit I won't name |
| | `in` | An instrument you play, or wish you did | Grade 3 piano, mostly forgotten |
| **Study & work** `st` | `ln` | Something you want to learn before you graduate | Fresh pasta by hand |
| | `jb` | The strangest job or chore you've ever had | Dressed as a giant carrot at a market |
| | `fc` | Where you focus best, and what you need there | Top floor of the library, no phone |
| | `sb` | A subject you'd study just for fun | Volcanoes. Just volcanoes. |
| **Weekends** `wk` | `ob` | Something you got weirdly obsessed with this year | Ranking every bakery on my bus route |
| | `us` | A skill that's useless but impressive | I can whistle with two fingers |
| | `sd` | Your ideal lazy Sunday | Pancakes, a long walk, then a nap |
| | `hb` | A hobby you'd start tomorrow if you had time | Pottery, so I can make my own mugs |
| **Screens & stories** `sc` | `rc` | A show, game or book you make everyone try | Outer Wilds. Go in blind. |
| | `cf` | Your comfort rewatch | Brooklyn Nine-Nine, fifth time round |
| | `ch` | A fictional character you'd be friends with | Paddington, obviously |
| | `fl` | A film you'd show someone to explain who you are | Spirited Away |
| **Tiny opinions** `tp` | `op` | A tiny opinion you'll defend forever | Toast should be cut into triangles |
| | `ov` | Something everyone loves that you find overrated | Brunch queues |
| | `un` | Something underrated that deserves more love | Ordinary tap water, honestly |
| | `rl` | A small rule you live by | Always say yes to a second dessert |
| **Travel** `tv` | `hm` | Where you grew up, and one thing only locals know | Bristol: never trust the first chippy |
| | `dt` | A place you'd go back to tomorrow | Lisbon, for the custard tarts |
| | `nx` | Somewhere you've never been but think about a lot | Iceland, for the northern lights |
| | `sv` | The best souvenir you've ever brought home | A tiny wooden bird from Kraków |

- **Known quirk:** prompt `ln` and theme `ln` share letters. They're separate namespaces, so add a comment and don't rename either.
- **Quick start** (people with no data): pick 5 prompts from **5 different themes** at random. "Different question" swaps in an unused prompt from a theme not already in the quick start.

### 4.3 Theme pages (`/themes/[id]`)

- One question per screen: the question in Fraunces, a one-line input (max 60), the placeholder, and a counter.
- "Next" is enabled once there's a non-space character. "Skip" and "Back" are always available. Answers save as you go.
- **No auto-advance:** typing needs a deliberate "Next".
- **Finish screen:**
  - The circle graphic updates, with "Food: 3 of 4 answered."
  - Primary button: "Next theme: London life". Quiet button: "Back home".
  - If this made the circle ready for the first time, the primary button is "Show my code" with "Your code is ready."

### 4.4 Circle status and readiness (replaces Your Circle §3.3 and §4.1 rules)

```ts
count            = number of non-empty typed answers in the profile
themeStatus(t)   = answered in theme t: 0 → "not started", 1–2 → "started", 3–4 → "done"
isReady(p)       = p.n !== "" && count >= 3
missingFor(p)    = isReady(p) ? 0 : Math.max(3 - count, 0)   // plus the name step if the name is missing
mode(p)          = count === 0 ? "quickStart" : isReady(p) ? "ready" : "topUp"
```

**Why 3:** three specific typed answers give Claude enough to find a real link, and a thin profile only needs one or two more questions when scanning.

**The quick start stays at 5 questions,** the user's explicit choice for first-timers.

### 4.5 The QR snapshot and the match request (an important change)

| Side | What it sends |
|---|---|
| **Your QR code** (what *others* scan) | `cardFromProfile` includes **as many of your most recently edited answers as fit**: minimum 3, maximum 10, with the full link ≤ 800 characters. Fresh 48-hour expiry each time it's shown. If even 3 won't fit (very long non-Latin answers), the code screen asks: "Shorten one of these answers so your code fits." |
| **The person scanning** (`a` in `/api/match`) | Sends **their whole circle** from their phone: every typed answer, up to 32. Nothing limits it to the QR size, because it never goes in a QR. |
| **The scanned card** (`b`) | 3–10 answers from the link. |

**Server (zod):**
- `a`: 3–32 answers. `b`: 3–10 answers.
- Readiness checked for both.
- Raise the body limit from 8 KB to **16 KB**.

**Answer IDs:**
- `A1`…`An` for the scanner (n up to 32) and `B1`…`Bm` (m up to 10).
- Each line in the prompt shows the theme and question: `A7 [Screens & stories · Your comfort rewatch]: Twilight on repeat`.
- The guard's typed-ID pattern becomes `^[AB]([1-9]|[12][0-9]|3[0-2])$`, and the ID must exist on that card.

**Privacy page:** "When you scan someone, your whole circle and their code are sent once to make your Venn. Our server keeps nothing. Your code (what others scan) carries only your most recent answers."

### 4.6 Demo mode

- It works with 3–32 answers on side A and 3–10 on side B.
- Extend the property test so it covers those sizes and always passes the guard.

### 4.7 Tests

| Area | Tests |
|---|---|
| prompts | 32 prompts, 4 per theme, all IDs unique, the 12 old IDs unchanged, every placeholder unique (Part 1 test). |
| readiness | count 0/1/2/3 with and without a name → the right `mode` and `missingFor`. |
| migration | A profile or card with taps → taps dropped, typed answers kept, the note shown once. An old link with taps still decodes. |
| snapshot | Most recent first. 32 answers at maximum length → the link stays ≤ 800 characters with 3–10 answers. The "shorten" state when 3 won't fit. |
| route | `a` with 32 answers → 200. `a` with 33 → 400. `b` with 11 → 400. `a` with 2 → 400. A 15 KB body is accepted; 17 KB returns 413. |
| guard | `A32` is accepted only when the card has 32 answers. The pattern rejects `A0`, `A33` and `A-fo2`. |
| components | Theme page Next/Skip/Back, no auto-advance, finish states. `/v` routing for each mode (ready = straight to matching). |

### 4.8 Eval

- Re-run the main eval with mixed circle sizes (3, 8, 20, 32 answers on the scanning side) plus the Part 3 context set.
- Report quality and latency by size.
- **If 32-answer prompts push median latency over 8 seconds,** cap what side A sends at the 20 most recent answers, and log the change.

### 4.9 Order of work and "done"

| Step | What | Done when |
|---|---|---|
| O1 | Question bank, placeholders, removal of taps, migration | Unit tests pass |
| O2 | Readiness, snapshot, route and schema changes, answer IDs, guard pattern | Unit and route tests pass |
| O3 | Theme pages, plain-list home, finish screens | Component tests pass; looks right at 360px |
| O4 | Push the branch. The human checks on the **preview URL** with two phones: an empty phone scans → 5-question quick start; a phone with 1 answer scans → asked 2 more; two ready phones → straight to Venns; the QR scans at 30 cm with a full circle; receipts show "Read as:" lines. | The human confirms all five |
| O5 | Eval (4.8), README and privacy updates, `docs/DECISIONS.md` entries, merge, check production | CI green; live URL updated |

**Decision-log entries:**
1. Open-ended only (taps removed) and why.
2. A ready circle = 3 answers, while the quick start stays at 5.
3. The scanner sends their whole circle, while the QR carries a recent subset.
4. `readings` first in the schema, so Claude interprets answers before linking.
5. A minimal landing with no sign-in.

---

## 5. Pitch deck: tell the team to update `venn-deck-prompt.md`

**After Part 3 ships:**
- Add this tick to section 0: `[ ] Receipts show how Claude read each answer ("Read as: …")`.
- On **slide 8**, if testing produced a real result like pair 2 (Robert Pattinson ↔ Twilight), use it as the example: "Claude knows Robert Pattinson is an actor, so 'Robert Pattinson' and 'Twilight on repeat' become one conversation." **Only if it really happened in testing.**

**After Part 2 ships:** screenshot the landing page for slide 4 or the title slide. It shows the minimal design best.

## 6. Report back with

1. The preview and production URLs for Parts 1–3, then for Part 4.
2. The context eval results: kind accuracy, the pair 8 and pair 9 outcomes, and median latency.
3. The link length for a full circle, and whether the QR scanned at 30 cm.
4. Anything you cut.
5. Two judge questions with 2-sentence answers:
   - "How does it know what my answer means?"
   - "What stops it making things up about a celebrity or a friend?"