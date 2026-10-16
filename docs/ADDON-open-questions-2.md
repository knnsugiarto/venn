# Venn add-on, part 2: Natural writing + mixed questions with "Other"

> **For the team**
> - Paste this **after** `venn-addon-open-questions.md`, in the same coding session. **Everything in that file still applies;** this file only adds to it or changes it where it says so.
>
> | Part | What it does | Where |
> |---|---|---|
> | **5** | Starters and headlines sound like a person talking, not a template, and never wrap people's answers in quotation marks | `main`, together with Parts 1–3 |
> | **6** | Themes mix multiple-choice (MCQ) and short-answer questions; every MCQ has an "Other…" option | Branch only, part of Part 4, same **10:00 hard stop** |

---

## 0. Before you start (agent)

1. Save this file as `docs/ADDON-open-questions-2.md`.
2. **Precedence:** this file > `ADDON-open-questions` > `ADDON-your-circle` > `ADDON-theme-packs` > `SPEC`.
3. **Part 5** goes on the same short-lived branch as Parts 1–3 (`feat/smarter-reading`) and is merged to `main` with them after the phone check.
4. **Part 6** amends Part 4. It goes on `feat/your-circle` (or `feat/open-questions`) only. Never merge it to `main` until section 6.9 is complete.

---

## Part 5: Natural, fluid writing (`main`)

**The problem:**
- Starters read like fill-in-the-blank templates.
- Wrapping someone's answer in quotation marks (`What's the story behind "I can whistle with two fingers"?`) turns it into an *object* instead of something a person said.

**The fix:**
1. Claude writes like a friend introducing two people.
2. The quote check moves out of sight: it stays as **hidden evidence** for our code, and is never shown as a quotation.

### 5.1 System prompt: replace the style bullets in the "Rules" section with this

In `match-prompt.ts`, remove the old bullets about starters' style ("Starters are open questions…", "British English. Warm, playful…"). Insert this section after "How to read answers":

```
How to write (this matters as much as the link):
- Write like a quick-witted friend introducing two people at a party, not like a form or a quiz. Every line should sound natural said out loud.
- Weave their answers in, in your own words. Never put their answers in quotation marks, and never paste an answer in word for word: "your two-finger whistle", not "I can whistle with two fingers". Names of things (a film, a dish, a city, an artist) are fine to use as they are, without quotation marks.
- Each starter joins something from each person into one real, open question (not yes/no), ideally a little playful or surprising. Never "A, tell B about X".
- Make the three starters feel different: for example, a playful dilemma, a curious "how", a mini debate. Each one starts differently.
- Don't use these stock phrases: "What's the story behind", "Tell each other about", "Tell us about", "If you could", "Have you ever", "Share your", "Fun fact", "Both of you", "Did you know".
- The headline is an observation a friend would make, not a label: "You'd both cross London for the right bowl of noodles", not "You both mentioned noodles".
- The challenge follows the same style: something they'd actually want to do in the next two minutes.
- British English, first names, no emoji, at most one exclamation mark in the whole reply, everything short.

Examples of the difference (do not reuse their content):
Flat: Ken, what's the story behind "I can whistle with two fingers"?
Better: Ken, could your two-finger whistle stop a bus faster than Amara's sprint for the 73?
Flat: You both mentioned food.
Better: You'd both cross London for the right bowl of noodles.
```

**Change the "Citations" paragraph to:**

```
Evidence (checked by code, never shown to the students):
- Every item cites exactly one answer from each person: an answer_id and a "quote" of 1 to 6 words copied exactly, character for character, from that answer. This is hidden evidence for our checker. It is NOT how you write the visible text: the visible text never uses quotation marks.
```

### 5.2 Schema descriptions (`match-schema.ts`)

- Keep the field name `quote`: renaming it would break the guard and tests for no gain. Change its description to:
  - "Hidden evidence for our checker: 1–6 words copied exactly from that answer. Never shown to users."
- Starter `text`: "One natural, open question joining both people's answers, at most 25 words, no quotation marks."
- `headline`: "At most 12 words. A friend's observation, not a label. No quotation marks."

### 5.3 Guard: add STYLE rules, which are separate from the FACT rules

`checkMatch` now returns two lists: `{ ok, problems, styleProblems }`.

- `problems` (**fact rules**) are everything that already exists: IDs, evidence, readings, counts, lengths, no scores.
- `styleProblems` are the new rules below. They apply to the **visible text only:** `headline`, `detail`, each `starters[].text` and `challenge.text`.

| # | Rule | Problem text for the retry prompt |
|---|---|---|
| S1 | No double quotation marks: `"` `“` `”` `„` `«` `»`. Apostrophes (`'` `’`) are fine. | "Don't put answers in quotation marks; weave them in." |
| S2 | No run of **6 or more consecutive words** copied from any answer. Compare after normalising both: lowercase, straight apostrophes, no punctuation. Shorter overlaps such as "the top floor of the library" are natural, so they pass. | "Don't copy answers word for word; say it in your own words." |
| S3 | None of the stock phrases from 5.1, case-insensitive. | "Avoid the stock phrase '<phrase>'." |
| S4 | The first two words of the three starters, after normalising, are all different. | "Start each of the three starters differently." |

**What the route does with each kind of problem:**
- **Any fact problem:** retry once with all problems listed. If the second reply still has fact problems, return 502 (unchanged).
- **Only style problems:** retry once with them listed. If the second reply still has style problems but **no fact problems**, return whichever of the two replies has fewer style problems, and don't show an error. Style must never break the demo.
- **Logging:** log the style problem codes (S1–S4) on the server, with no user content, so the eval can count them.

### 5.4 Result screen and receipts: no quotation marks anywhere

- **Remove** the two quote chips under the headline. Show Claude's `detail` sentence there instead, in ink-soft.
- **Receipts** show answers as answers: the prompt in small ink-soft text, then the person's answer on the next line in ink. No quotation marks.
  - Keep the subtle clay-pale highlight on the evidence words, and the "Read as:" line from Part 3.
- **Receipts footer** becomes: "Everything above is built from what you both wrote. Our code checks every line against your answers, and shows how Claude read each one."
- Search the codebase and remove any UI copy that says the starters "quote" people.

### 5.5 Demo mode: less template-y, no quotation marks

- Add a short **topic phrase** to every prompt in `lib/prompts.ts`, e.g.:
  - `us` → "useless-but-impressive skill"
  - `sn` → "2am snack"
  - `cf` → "comfort rewatch"
  - `hm` → "hometown secret"
  - `ob` → "latest obsession"
- Write **at least 8 starter templates** that use topic phrases and names, not answers, and vary their openings. For example:
  - "{B}, would you trade your {topicB} for {A}'s {topicA} for a week?"
  - "{A}, how would your {topicA} go down at {B}'s next weekend plan?"
  - "Quick debate: which says more about a person, a {topicA} or a {topicB}?"
- Write at least 4 challenge templates in the same style.
- Rotate the templates by `variant`.
- **Hidden evidence** still cites real answer IDs, using the first 1–3 words of each answer.
- **Demo output must pass every fact rule and every style rule.** Extend the property test.

### 5.6 Eval additions

- Add a column "**Sounds natural? (y/n)**" for the human.
- Report automatically:
  - The share of replies with **no style problems on the first try** (target ≥ 85%).
  - How often each of S1–S4 fires.
  - The share of results where style problems remained after the retry.
- If a rule fires often, improve the 5.1 wording. Don't loosen the rule.

### 5.7 Tests

| Area | Tests |
|---|---|
| guard style | S1: a curly double quote fails, an apostrophe in "you're" passes. S2: a 6-word copy fails, 5 words pass, and normalisation catches case and punctuation differences. S3: each banned phrase fails. S4: two starters beginning "Which would" fail. Style problems never appear in `problems`, and fact problems never appear in `styleProblems`. |
| route | Style-only failures twice → 200 with the reply that has fewer style problems, and exactly 2 Claude calls. A fact failure twice → 502. |
| UI | No `"` `“` `”` characters rendered anywhere on the result screen with fixture data. The detail sentence replaces the chips. |
| demo | 50 random pairs pass all fact and style rules. |

**Done when:** the tests pass, the human reads 5 Venns on the preview URL and says they sound natural, and it's merged to `main` with Parts 1–3.

---

## Part 6: Mixed questions, with "Other…" on every MCQ (branch only, amends Part 4)

**What changes from Part 4:**
- Themes now **mix multiple-choice and short-answer questions**. Part 4's line "no more tap or multiple-choice questions" is replaced by this part.
- **Every multiple-choice question ends with "Other…"**, which opens a short text box, so nobody is forced into an option that doesn't fit them.

### 6.1 Question bank: keep Part 4's 32 short-answer prompts and add 16 MCQs

Each theme = **2 MCQs + 4 short answers = 6 questions**, 48 in total. All questions are skippable.

- **MCQ IDs** are new 2-letter IDs, part of the link format. Never change what an ID or an option's position means.
- **The "Other…" option is not stored as an index;** it's stored as the typed text (see 6.4).

| Theme | ID | MCQ | Options (always followed by "Other…") |
|---|---|---|---|
| Food | `sl` | Spice level? | Mild, please · Medium · Make me cry |
| Food | `bk` | Breakfast is… | Sweet · Savoury · Skipped |
| London life | `rn` | Rainy-day plan? | Museum · Café · Pretend it isn't raining · Stay in |
| London life | `sm` | Saturday morning? | Market · Lie-in · Gym · Gallery |
| Music | `gn` | On repeat right now? | Pop · Hip-hop · Rock or indie · Electronic |
| Music | `kk` | Karaoke? | First up · After some persuading · Never ever |
| Study & work | `tm` | Best time to focus? | Early bird · Afternoon · Night owl |
| Study & work | `dl` | Deadlines? | Done early · Steady pace · The night before |
| Weekends | `pl` | Weekend plans? | Packed · One thing · Absolutely nothing |
| Weekends | `io` | Indoors or out? | Outdoors · Indoors · Depends on the weather |
| Screens & stories | `fn` | Film night? | Comedy · Horror · Animation · Documentary |
| Screens & stories | `bf` | Books? | Paper · E-reader · Audiobook · Not my thing |
| Tiny opinions | `ts` | Toast? | Triangles · Rectangles |
| Tiny opinions | `pz` | Pineapple on pizza? | Yes · No · Only ironically |
| Travel | `ht` | Holiday type? | Beach · City · Mountains · Road trip |
| Travel | `pk` | Packing? | A week before · The night before · An hour before |

- **Type:** `type Prompt = { id; theme; kind: "short" | "mcq"; q: string; options?: string[]; placeholder?: string; topic: string }`.
- **Content test:** 48 prompts, 6 per theme (2 MCQ + 4 short), all IDs unique, the 12 original IDs unchanged, 2–4 options per MCQ before "Other…", every option at most 30 characters.

### 6.2 Theme flow and MCQ screen

- **Order in each theme:** the 2 MCQs first (fast warm-up), then the 4 short answers.
- **MCQ screen:**
  - The question in Fraunces, then the options as large stacked pill buttons (`<button aria-pressed>` inside `role="group"`), with **"Other…" always last**.
  - **Tapping a normal option:** it fills with clay, and the page moves on after 250ms (at once under reduced motion).
  - **Tapping "Other…":** no auto-advance. A one-line input slides open under it (max 60 characters, autofocus, placeholder "Your answer"), with "Next". "Next" is enabled once there's a non-space character.
  - **Re-opening an answered MCQ:** the chosen option, or "Other…" with its text, is shown selected.
- **Short-answer screens:** unchanged from Part 4 (no auto-advance).
- **Theme finish:** "Food: 4 of 6 answered." `themeStatus` now counts 6 questions: 0 = not started, 1–3 = started, 4–6 = done.

### 6.3 Quick start (people with no answers, branch only)

- **On this branch:** the quick start becomes **3 short answers + 2 MCQs**, from 5 different themes, in the order short, MCQ, short, MCQ, short. It's faster and more fun, and the 3 written answers still give Claude real material.
- **"Different question"** swaps for another prompt **of the same kind** from an unused theme.
- **On `main`:** the quick start stays at 5 short answers until this branch is merged.

### 6.4 Data and link encoding

- **Each stored answer** is `[promptId, value]`:
  - A **short answer:** `value` is a string (1–60 characters).
  - An **MCQ option:** `value` is the option index (an integer).
  - An **MCQ "Other…":** `value` is the typed string (1–60 characters). A string on an MCQ prompt means "Other".
- **Validation (zod, client and server):** short prompts accept strings only; MCQ prompts accept an integer within range, or a string.
- **"Written" answers** are short answers plus MCQ "Other" answers. They're the ones that carry specific detail.

### 6.5 Readiness (replaces Part 4 §4.4)

```ts
count        = all answered questions
written      = short answers + MCQ "Other" answers
isReady(p)   = p.n !== "" && written >= 1 && count >= 3
missingFor(p) = isReady(p) ? 0 : Math.max(3 - count, written === 0 ? 1 : 0)
// Top-up asks short-answer questions first when written === 0.
mode(p)      = count === 0 ? "quickStart" : isReady(p) ? "ready" : "topUp"
```

**Why at least 1 written answer:** MCQ options are shared by half the room. A circle of only MCQs gives generic Venns, and the guard (6.7) needs a written answer for the main link.

### 6.6 QR snapshot (replaces Part 4 §4.5 for the QR only)

- `cardFromProfile` includes **every MCQ option answer** (each costs about 3 characters) plus **as many of the most recent written answers as fit**: minimum 1, maximum 10, full link ≤ 800 characters.
- The snapshot must itself be ready (at least 1 written answer, at least 3 in total).
- The person scanning still sends their **whole** profile (up to 48 answers).

### 6.7 Matching (amends Part 4 §4.5)

- **Answer IDs:**
  - `A1`…`An` (n ≤ 48) and `B1`…`Bm` (m ≤ 26: 16 MCQ + 10 written), numbered in profile/card order.
  - Guard ID pattern: `^[AB]([1-9]|[1-3][0-9]|4[0-8])$`, and the ID must exist on that card.
- **Prompt lines** show the question type, and resolve MCQ indexes to option text on the server:
  - `A3 [Food · Spice level? · multiple choice]: Make me cry`
  - `A4 [Food · Breakfast is… · multiple choice, own answer]: cold pizza`
- **Add this paragraph to the system prompt** (after "How to read answers"):

```
Some answers are multiple choice (marked "multiple choice"). Many people pick the same options, so they are weak evidence on their own:
- The main link must always use at least one written answer (a short answer, or a multiple-choice "own answer").
- Use multiple-choice picks for colour, a quick contrast, or one side of a starter.
- "Own answer" responses were typed by the person and are often the most interesting thing on their card.
```

- **Guard:**
  - Re-add the **link-specificity fact rule:** at least one side of `link` cites a written answer. Problem text: "The main link must use at least one written answer."
  - **Evidence for an MCQ option:** the quote must be a substring of the option label. For an "Other" answer, it must be a substring of the typed text.
  - Readings (Part 3) and style rules (Part 5) are unchanged.
- **Server zod:**
  - `a` has up to 48 answers; `b` up to 26.
  - Both cards are checked for readiness.
  - The 16 KB body limit stays.
- **Demo mode:**
  - Uses written answers for the link.
  - May use a shared MCQ pick in the third starter, phrased naturally with no quotation marks, e.g. "Night owls, the pair of you. What's the best thing you've done after midnight in London?"
  - Must pass all fact and style rules.

### 6.8 Tests

| Area | Tests |
|---|---|
| prompts | 48 prompts, the 2 + 4 split, MCQ option limits, unique IDs, the 12 original IDs unchanged. |
| encoding | Round trip with an MCQ index, an MCQ "Other" string and a short string. Rejected: an MCQ index out of range, an integer on a short prompt. A full circle stays ≤ 800 characters with all MCQs plus 1–10 written answers. |
| readiness | Only MCQs (3) → `topUp`, asking 1 short question. 1 written + 2 MCQ → ready. 0 answers → quick start. |
| guard | A link citing only MCQ options fails. A link citing an MCQ "Other" answer passes. MCQ evidence must match the option label. |
| UI | Tapping an option auto-advances. "Other…" opens the input without advancing. Re-opening restores the selection. The quick start is 3 short + 2 MCQ, from 5 different themes. |

### 6.9 Phone check before merging (adds to Part 4's five checks)

- [ ] An MCQ with "Other…" is saved and shows correctly in receipts.
- [ ] A phone with only 3 MCQ answers scans → asked exactly 1 short question → Venn.
- [ ] The QR still scans at 30 cm with a full circle (48 answers).

### 6.10 Decision-log entries

1. A mix of MCQs and short answers: MCQs are fast and fun; short answers carry the specifics.
2. Every MCQ has "Other…": nobody is forced into a box.
3. "Other" answers count as written answers.
4. The quick start becomes 3 short + 2 MCQ on the branch.
5. Style rules are soft (never break a demo) and fact rules are hard.

---

## 7. Tell the team: deck and pitch wording

Receipts no longer "quote" people, so change these phrases:

| Where | Change "quotes" wording to |
|---|---|
| `venn-deck-prompt.md` slide 6 callout | "Show receipts: every line is checked against what you both wrote" |
| `venn-deck-prompt.md` slide 8, the guard box | "every line must use one real answer from each person" |
| Pitch script | "our code checks that every question is built from something you both actually wrote" |

**If Part 6 ships:** add a section 0 tick, `[ ] Themes mix quick multiple-choice and short answers (always with "Other…")`, and mention it in one line on slide 7.

## 8. Report back with

1. Preview, then production, URLs for Part 5; preview URLs for Part 6.
2. The style eval numbers: first-try style pass rate and how often each rule fired.
3. Three real starters from the preview URL, so the team can judge the tone.
4. The full-circle link length, and whether the QR scanned at 30 cm.
5. Anything you cut.