# Venn add-on: Theme packs (optional profile boosters)

> **For the team: when to paste this**
> - Paste this into the **same** coding-agent session that is building Venn from `venn-build-prompt.md`, **only after milestone M4 works on the live URL** (two phones scan each other and see a Venn). The agent will check that itself.
> - **Cut rule:** if this isn't merged by **Thursday 12:00 London**, drop it. The core demo matters more. The agent works on a separate branch, so dropping it costs nothing.

---

## 0. Before you start (agent)

1. Re-read `docs/SPEC.md`. This add-on changes sections 6, 7, 9, 10, 11, 13 and 14 of it. Where the two conflict, this add-on wins; everything else in the spec still applies.
2. **Check the gate:** milestones M0–M4 are done, all tests pass, and the main deployment shows a working Venn.
   - If not, **stop**. Tell the human what's missing and finish M0–M4 first.
3. Create a branch: `git switch -c feat/theme-packs`.
   - Vercel builds a separate preview URL for every pushed branch, so the team can test packs on phones without touching the live demo.
   - Merge to `main` only when section 9's "done" list is complete.
4. Save this file as `docs/ADDON-theme-packs.md`.

## 1. What we're adding, and why

**Theme packs:** short, optional, **tap-only** questionnaires (5 questions each, about 30 seconds) that a user can add to their card from the home page. Examples: Food, London life, Music, Study style.

The answers travel inside the same QR link as the card. When two people scan each other, Claude has more to work with, so Venns get sharper. Teammates can pre-enrich their cards before the demo.

### Product rules (don't break these)

1. **Optional, always.**
   - Making a card and scanning never require a pack.
   - Venn never blocks, nags or shows a pop-up about packs.
   - The only nudge is one quiet line under a Venn result (section 4.4).
2. **Tap-only. No free text in packs.** This is deliberate:
   - It keeps the QR code small enough to scan.
   - It keeps packs fast and fun.
   - It protects the core idea: specific free-text answers are what make a Venn surprising.
3. **Multiple-choice answers are weak evidence.** Half the room picks "Night owl". The main link of every Venn must still cite at least one **free-text** answer. The guard enforces this (section 6.3), so Venn never turns into "you both like music", the exact problem the pitch criticises.
4. **No scores of any kind.**
   - Show progress as "3 of 8 packs added", never "Profile 60% complete".
   - No streaks and no badges.
5. **No sensitive topics.** Use the pack content below, which avoids religion, politics, health, relationships, alcohol and money. Don't add questions on those topics.
6. **No database.** Packs live on the phone and in the QR link, like the rest of the card.

## 2. Pack content (`src/lib/packs.ts`)

- **IDs are part of the link format.** Never change what a pack ID, question number or option position means. To change content, add a new question or pack instead.
- **Options are in order;** their position (0, 1, 2…) is what gets stored.
- **The UI says "Question 1 of 5",** so question numbers in IDs are 1-based.

| Pack ID | Name | Icon (lucide) |
|---|---|---|
| `fo` | Food | `UtensilsCrossed` |
| `ln` | London life | `TrainFront` |
| `ms` | Music | `Music` |
| `st` | Study style | `BookOpen` |
| `wk` | Weekends | `Sun` |
| `sc` | Screens & stories | `Clapperboard` |
| `tp` | Tiny opinions | `Scale` |
| `tv` | Travel | `Plane` |

**`fo` Food**
1. Breakfast? → Sweet · Savoury · Skip it · Whatever's left
2. Spice level? → Mild please · Medium · Make me cry
3. Late-night snack? → Instant noodles · Toast · Fruit · Something fried
4. Tea or coffee? → Tea · Coffee · Both · Neither
5. In the kitchen you… → Follow the recipe · Cook on vibes · Master the microwave · Let someone else cook

**`ln` London life**
1. Getting around? → Tube · Top deck of the bus · Walk everywhere · Cycle
2. Best free thing in London? → Museums · Parks · Markets · Just wandering
3. Rainy-day plan? → Museum · Café · Pretend it's not raining · Stay in
4. Saturday morning? → Market · Lie-in · Gym · Gallery
5. Touristy thing you secretly love? → South Bank · Camden · Big Ben · Haven't done any yet

**`ms` Music**
1. Headphones on? → Always · Sometimes · Rarely
2. Live music? → Small gigs · Big festivals · My bedroom is the venue
3. On repeat right now? → Pop · Hip-hop and rap · Rock and indie · Electronic · Something else
4. Karaoke? → First up · After some persuading · Never ever
5. Shower singing? → Full concert · Humming · Silence

**`st` Study style**
1. Best time to focus? → Early bird · Afternoon · Night owl
2. Where? → Silent library · Busy café · In bed · Wherever's free
3. Deadlines? → Done early · Steady pace · The night before
4. In group projects you're… → The leader · The ideas person · Quietly doing the work · In charge of snacks
5. Study soundtrack? → Silence · Lo-fi · Songs with lyrics · Rain sounds

**`wk` Weekends**
1. Plans? → Packed · One thing · Absolutely nothing
2. Indoors or out? → Outdoors · Indoors · Depends on the weather
3. Ideal Sunday? → Long walk · Big brunch · Gaming · Making something
4. Spontaneous trip? → Yes, let's go · Give me a week's notice · I'll see the photos
5. New hobbies? → Try everything · One deep obsession · Comfort zone, thanks

**`sc` Screens & stories**
1. Film night? → Comedy · Horror · Animation · Documentary
2. Rewatch or new? → Rewatch my comfort show · Always something new
3. Books? → Paper · E-reader · Audiobook · Not my thing
4. Games? → Phone · Console · PC · Board games · Not really
5. Spoilers? → Fine by me · Absolutely not

**`tp` Tiny opinions**
1. Toast? → Triangles · Rectangles
2. Pineapple on pizza? → Yes · No · Only ironically
3. Window or aisle? → Window · Aisle
4. Cereal or milk first? → Cereal first · Milk first · Don't do cereal
5. Best biscuit for tea? → Digestive · Custard cream · Hobnob · Not a dunker

**`tv` Travel**
1. Holiday type? → Beach · City · Mountains · Road trip
2. Packing? → Week before · Night before · An hour before
3. Planning? → Every hour planned · Rough idea · No plan at all
4. Souvenir? → Fridge magnet · Snacks · Photos · Nothing
5. Dream next trip? → Somewhere hot · Somewhere cold · Anywhere with good food

**Types:**

```ts
export type PackId = "fo" | "ln" | "ms" | "st" | "wk" | "sc" | "tp" | "tv";
export type Pack = { id: PackId; name: string; icon: string; questions: { q: string; options: string[] }[] };
export const PACKS: readonly Pack[];                 // order above = order on the home page
export function packAnswerLabel(packId: PackId, qIndex: number, option: number): string; // throws on bad input
```

**Unit tests for the content:**
- Every pack has exactly 5 questions.
- Each question has 2–5 options, and no two options in a question are identical.
- No option is longer than 30 characters.

## 3. Data model and link encoding (changes `card.ts` and `codec.ts`)

**In memory:**

```ts
type PackAnswers = (number | null)[];               // length 5; option index or null = skipped
type Card = { /* …existing fields… */ p?: Partial<Record<PackId, PackAnswers>> };
```

**Validation (zod, browser and server):**
- The pack ID is known.
- The array has exactly 5 entries.
- Each entry is `null` or an integer from 0 up to (number of options − 1).
- A pack with every entry `null` is dropped, not stored.

**On the wire (compact form):**
- Add an **optional 7th element** to the compact array: `[1, id, name, course, exp, answers, packs?]`.
- `packs` is one string: each answered pack written as its ID followed by 5 characters, one per question. Each character is the option index (`0`–`4`), or `-` if skipped. Packs are joined with `.`, in `PACKS` order.
  - Example: `"fo1203-.st2-101"`.
  - All 8 packs come to about 63 characters before compression.
- **Keep `v: 1`.** Links made before this change (no 7th element) must still decode. Write a test for that.
- **QR budget is unchanged:** the full link must still be **≤ 800 characters**. Add a test with every core answer at the maximum length (ASCII) plus all 8 packs fully answered. Log the typical length.

**Storage and expiry:**
- Packs are saved with the card in `venn.card.v1`.
- Adding or editing a pack updates the QR immediately and refreshes the 48-hour expiry, just like editing the card.

## 4. Screens

Same design system as the spec (section 8 of `docs/SPEC.md`): paper, ink, one clay accent, Fraunces + Inter, one primary action per screen, 44px tap targets, CSS-only motion, reduced-motion respected.

### 4.1 Home with a card: QR first, packs below

```
┌──────────────────────────────┐
│  [My code: unchanged, top]   │
│  …                           │
│ ──────────────────────────── │
│  Add more to your card       │  ← Fraunces 24px
│  Optional. Quick taps that   │
│  give Claude more to work    │
│  with. 3 of 8 added.         │
│                              │
│ ┌─────────────┐┌───────────┐ │
│ │ [icon] Food ││ [icon]    │ │  ← [icon] = lucide icon, never emoji
│ │ ✓ Added     ││ London    │ │
│ │ Edit        ││ 5 quick   │ │
│ │             ││ taps      │ │
│ └─────────────┘└───────────┘ │
│ ┌─────────────┐┌───────────┐ │
│ │ [icon] Music││ [icon]    │ │
│ …  (2 columns, 8 tiles)      │
└──────────────────────────────┘
```

- The section has `id="packs"`, so other screens can link to `/#packs`.
- **Tiles:**
  - Oat background, 20px radius, the whole tile tappable, minimum 96px tall.
  - Not added: "5 quick taps" in ink-soft.
  - Added: a small clay check icon, "Added", and "Edit" as visible text. Never rely on colour alone.
- **The QR stays the hero.** Packs sit below it and must never push the QR off the first screen on a 360×640 phone.

### 4.2 Home without a card

- Below the existing intro, add the same grid with the heading "Theme packs" and the line "Add these after you make your card."
- Tapping a tile goes to `/make?next=/packs/<id>`. The builder header adds "Then we'll open the Food pack." After saving, go to that pack.
- **Security:** `next` must be validated against an allowlist of internal paths (`/packs/<known id>` only), which prevents an open redirect, i.e. a link that bounces users to another site. Write a test for it.

### 4.3 Pack page `/packs/[id]`

```
┌──────────────────────────────┐
│ ← Back      Food   ● ● ○ ○ ○ │
│ Question 2 of 5              │
│                              │
│ Spice level?                 │  ← Fraunces ~30px
│                              │
│ ┌──────────────────────────┐ │
│ │ Mild please              │ │  ← big pill buttons, stacked
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Medium                   │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ Make me cry              │ │
│ └──────────────────────────┘ │
│                              │
│ Skip this one                │  ← quiet text button
└──────────────────────────────┘
```

- **Tapping an option:**
  1. It fills with clay and ink text.
  2. After 250ms the page moves to the next question. Under reduced motion, it moves at once.
  3. The answer is **saved immediately**, so leaving halfway keeps it.
- **Options are `<button aria-pressed>`** inside `role="group"` with `aria-labelledby` pointing at the question. Don't use radio inputs: arrow keys on radios would auto-advance by accident.
- **Keyboard:** Tab moves through the options; Enter or Space selects and advances.
- **Back** returns to the previous question with its choice still selected. **Skip** stores `null` and advances.
- **Editing a finished pack** opens at question 1 with the earlier choices selected.
- **Finish screen:**
  - The heading "Food pack added", plus the same small 6-dot clay burst used elsewhere.
  - Primary button: "Next pack: London life", pointing to the next pack not yet added. If all are done, it says "Back to my code".
  - Quiet buttons: "Back to my code" and "Remove this pack" (asks to confirm).
- **Unknown pack ID:** show the app's normal not-found page.
- **No card:** redirect to `/make?next=/packs/<id>`.

### 4.4 The one nudge (Venn result screen)

- Under "Another one", if the **viewer** has fewer than 2 packs, show one quiet line: "Want sharper Venns? Add a theme pack (30 sec)", linking to `/#packs`.
- Never as a pop-up, never before the result, and never on the `/v` builder flow. Someone who just scanned a QR should reach their Venn as fast as possible.

### 4.5 Receipts

- If a starter or the link cites a pack answer, show it in the receipts as `Food · Spice level? → Make me cry`, with the quoted words highlighted like any other answer.
- The source line under a starter names it in the same way, e.g. "from Ken's Food pack".

## 5. Privacy page

Add one line: "Theme pack answers are stored the same way as your card: on your phone and inside your QR link, never on our server."

## 6. Matching changes

### 6.1 Answer IDs

| Kind | Format | Example |
|---|---|---|
| Core free-text answers | Unchanged | `A1`–`A5`, `B1`–`B5` |
| Pack answers | Person + `-` + pack ID + question number (1–5) | `A-fo2` = person A, Food pack, question 2 |

- Only answered (non-null) questions get an ID.
- One helper in `lib/` builds the full answer list `{ id, label, text, kind: "core" | "pack" }[]` for a card. The prompt builder, guard, demo matcher and receipts all use it, so IDs can't drift between them.

### 6.2 Prompt (`match-prompt.ts`)

**User message:**
- Inside each `<card>`, after the five core answers, add a `<packs>` block with one line per answered pack question, e.g. `A-fo2 [Food · Spice level?]: Make me cry`.
- Leave out the `<packs>` block if the card has no packs.
- Pack labels come from our own `PACKS` data, not from user input, but run them through the same `<`/`>` escaping anyway, so there's only one code path.

**Add this paragraph to the system prompt**, before the "Citations" section:

```
Some people also answered quick multiple-choice theme packs (answer IDs like A-fo2). Many people pick the same options, so pack answers are weak evidence on their own:
- The main link must always cite at least one free-text answer (A1–A5 or B1–B5).
- Use pack answers to add colour, sharpen a contrast, or as one side of a starter.
- Two people picking the same option is only worth mentioning if it connects to something specific one of them wrote.
- A quote from a pack answer must be copied exactly from the option text.
```

### 6.3 Guard (`guard.ts`)

New and changed rules. Give each its own small function with a "why" comment.

1. **IDs:**
   - Accept `A1`–`A5` and `A-<pack><1–5>` for `a` refs, and likewise for `b`.
   - The ID must exist in that person's answer list, which means the pack question was actually answered.
2. **Quotes for pack answers:** the normalised quote must be a substring of the normalised option label. The existing quote rule, applied to the label.
3. **New rule: link specificity.** At least one of `link.a` and `link.b` must cite a **core** answer. If not, the problem text is: "The main link must cite at least one free-text answer (A1–A5 or B1–B5)."
4. Everything else is unchanged.

### 6.4 Demo mode (`demo-match.ts`)

- The link logic is unchanged: it always uses core answers, so it passes rule 3.
- **New:** if both people picked the same option for the same pack question, the **third** starter uses it:
  - `You both picked "${label}" for "${question}". Who takes it more seriously?`
  - It cites the matching `A-…` and `B-…` IDs.
- Its output must still pass the guard. Extend the 50-pair property test so half the generated cards have random packs.

### 6.5 API route

- No new endpoint. The request schema accepts the optional `p` on both cards; the server validates it with the shared zod schema.
- The 8 KB body limit still holds. A full card with all packs is well under 2 KB; add a test to prove it.

## 7. Tests to add

| Area | Tests |
|---|---|
| codec | Round trip with packs (some skipped). An old link with no 7th element still decodes. Each of these is rejected as `malformed`: an unknown pack ID, a wrong length, an option index out of range. **Max card + all 8 packs ≤ 800 characters.** |
| packs content | The rules at the end of section 2. |
| guard | A valid pack citation passes. A pack ID that wasn't answered fails. A pack quote that isn't in the option label fails. A link citing only pack answers fails with the specificity problem. A wrong person prefix (`B-fo2` in an `a` ref) fails. |
| prompt | With packs, the `<packs>` lines appear with the right IDs and labels. Without packs, the block is absent. |
| route | A request with packs reaches the fake Claude client with them in the message. Malformed packs return 400. A full card with all packs stays under 2 KB. |
| components | Home tiles show "5 quick taps" / "Added" / "Edit" correctly, plus the "3 of 8 added" count. The pack page: tap saves and advances, Back keeps the choice, Skip stores null, the finish screen offers the next unadded pack, keyboard Enter selects. `next` redirect validation. |
| e2e (if Playwright exists) | Make a card, add the Food pack, open a second test card's link in demo mode: the Venn appears. |

## 8. Eval update (`scripts/eval-pairs.ts`)

- Give **10 of the 20 test personas** pack answers (3–8 packs each, varied).
- In the results file, add columns: "packs: A/B counts", "cited a pack answer?", "guard passed first try?".
- At the end, print a short summary comparing pairs with packs to pairs without: first-try guard pass rate, and how often the team marked "Good?" (left blank for humans).
- **Target:** the first-try pass rate doesn't fall by more than 5 percentage points with packs. If it does, tighten the system prompt paragraph in 6.2 and write down the change in `docs/DECISIONS.md`.

## 9. Order of work and "done"

| Step | What | Done when |
|---|---|---|
| P1 | `packs.ts`, card and codec changes, their tests | Tests pass; the max-length link is ≤ 800 characters |
| P2 | Home grid (both states), `/packs/[id]`, finish screen, nudge, receipts | Component tests pass; looks right at 360px |
| P3 | Answer-ID helper, prompt, guard, demo-mode changes, route tests | All tests pass |
| P4 | Push the branch. On the **Vercel preview URL**, check on two real phones (iPhone and Android): add 3 packs to one card and none to the other, scan both ways, and confirm the QR still scans at 30 cm and the Venns make sense. | The human confirms the phone check |
| P5 | Run the eval (section 8), update the README ("Theme packs" paragraph + updated privacy line), add `docs/DECISIONS.md` entries, merge to `main`, confirm the production deploy | CI green on `main`; live URL shows packs |

**Decision-log entries to write:**
1. Packs are tap-only, never free text: QR size, speed, and protecting specificity.
2. The link must cite a free-text answer: stops generic "you both like X" Venns.
3. Packs live in the QR link, not a database: same privacy model as the card.
4. Progress is shown as a count, not a percentage: consistent with "we never score people".

## 10. Report back with

1. The preview URL (then the production URL once merged).
2. The typical and maximum link length with packs, and whether the QR scanned reliably on both phones.
3. The eval comparison, packs versus no packs.
4. Anything you cut or couldn't test.
5. Two judge questions about this feature, each with a strong 2-sentence answer. For example:
   - "Isn't this just interest tags, which you said don't work?"
   - "Where are these answers stored?"