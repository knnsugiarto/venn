# Venn add-on: Your Circle (a profile that remembers you)

> **For the team: read this before pasting**
> - **What it does:**
>   - Your answers now build up a saved profile called **Your Circle**. In a Venn diagram, each person is a circle; the more of yours you fill in, the more there is to overlap.
>   - You fill it in from themed questionnaires on the home page.
>   - When you scan someone, Venn goes **straight to your Venn** if your circle is ready. The 5-question quick start only appears for someone with no answers at all. Someone with a few answers is asked only for what's missing.
> - **Paste it into the same coding-agent session** that built Venn. If theme packs (`venn-addon-theme-packs.md`) were never built, paste that file too, in the same message, *before* this one.
> - **Hard stop:** this changes the core scan flow the night before the demo. The agent works on a separate branch. **If it isn't merged and tested on two real phones by Friday 10:00 London, drop it** and demo the version on `main`. Judges arrive with no answers, so they see the 5-question quick start either way.

---

## 0. Before you start (agent)

1. **Check the gate.** The core flow (milestones M0–M4 in `docs/SPEC.md`) works on the production URL and all tests pass. If not, **stop**, tell the human, and fix the core first.
2. Create a branch: `git switch -c feat/your-circle`. Never push this work to `main` until section 10's "done" list is complete. Vercel gives the branch its own preview URL for phone testing.
3. Read `docs/SPEC.md` and, if it exists, `docs/ADDON-theme-packs.md`.
   - **Theme packs not built yet?** Build them as part of this add-on, using the pack content in section 2 of `venn-addon-theme-packs.md`.
   - **Where this file disagrees with either one, this file wins.**
4. Save this file as `docs/ADDON-your-circle.md`.

## 1. The idea in one paragraph

- **Today:** your "card" is five typed answers, made in one go, often at the moment you scan someone.
- **After this change:**
  - Your answers live in **Your Circle**, a profile saved only on your phone, that grows whenever you answer a themed questionnaire on the home page.
  - Your QR code is always made fresh from your circle.
  - When you scan someone:
    - **Ready circle:** straight to the Venn.
    - **Some answers, but not enough:** only the missing questions ("Answer 2 quick questions first").
    - **No answers at all:** the familiar 5-question quick start, after which those answers are saved in your circle for next time.

### Rules that don't change

- **No database.** The circle lives in `localStorage` on the phone; the QR link carries a snapshot of it.
- **No scores.** Progress shows as counts ("3 of 8 themes"), never percentages, and there are no "profile strength" bars or badges.
- **No sensitive topics, first name only,** and every Venn's main link must quote a typed answer (the guard rule from the theme-packs add-on).
- **Nothing ever blocks a first-time user.** The quick start stays one minute long.

## 2. Naming and copy

| Concept | What users see | Code name |
|---|---|---|
| The saved profile | **Your Circle** | `profile` |
| Answering more | **Fill your circle** | |
| A themed questionnaire | **Theme** (e.g. "Food") | `theme` |
| A typed question inside a theme | **In your own words** | `prompt` (unchanged) |
| A tap question | (no label; just the question) | `tap` (was "pack question") |
| The 5-question flow for new users | **Quick start** | `quickStart` |
| The flow for nearly-ready users | **Almost there** | `topUp` |
| The QR snapshot | **Your code** | `card` (unchanged) |

**Tagline on the home page:** "Fill your circle. More to overlap with."

## 3. Data model

### 3.1 Themes = taps + typed prompts

Each of the 8 themes from the theme-packs add-on keeps its **5 tap questions, unchanged**. It also gains **1–2 typed prompts**, which are the existing 12 prompts from `lib/prompts.ts`, moved into themes. **Prompt and pack IDs stay exactly the same,** because they're part of the link format.

| Theme (pack ID) | Typed prompts added (prompt IDs) |
|---|---|
| Food (`fo`) | `fd` A food from home you'd queue an hour for · `mk` The last thing you made, fixed or cooked from scratch |
| London life (`ln`) | `wd` Your perfect free Wednesday afternoon in London · `vs` Where you'd take a friend visiting London |
| Music (`ms`) | `sg` A song that gets you dancing, no matter what |
| Study & work (`st`, renamed from "Study style"; names aren't in links) | `ln` Something you want to learn before you graduate · `jb` The strangest job or chore you've ever had |
| Weekends (`wk`) | `ob` Something you got weirdly obsessed with this year · `us` A skill that's useless but impressive |
| Screens & stories (`sc`) | `rc` A show, game or book you make everyone try |
| Tiny opinions (`tp`) | `op` A tiny opinion you'll defend forever |
| Travel (`tv`) | `hm` Where you grew up, and one thing only locals know |

There's a known quirk: prompt `ln` (learn) and pack `ln` (London life) share letters. They live in separate parts of the link format, so nothing breaks. Add a comment and **don't rename either**.

### 3.2 The profile (`lib/profile.ts`, localStorage key `venn.profile.v1`)

```ts
type Profile = {
  v: 1;
  id: string;                                   // same 8-char id format as the card; created once, never changes
  n: string;                                    // first name ("" until given)
  c: string;                                    // course, optional
  typed: Partial<Record<PromptId, { text: string; at: number }>>;  // at = last edited, Unix ms
  taps: Partial<Record<PackId, (number | null)[]>>;                // as in the theme-packs add-on
};
```

**Migration (must not lose anyone's existing card):**
- On first load, if `venn.card.v1` exists and `venn.profile.v1` doesn't, convert the card into a profile: name, course, the 5 typed answers with `at = now`, and any packs.
- Then remove the old key. Unit-test this.

**"Clear my circle"** (at the bottom of the home page, with a confirmation): deletes the profile from this phone.

### 3.3 Readiness (`lib/readiness.ts`, pure functions, fully unit-tested)

```ts
typedCount = number of non-empty typed answers
total      = typedCount + number of answered (non-null) taps

isReady(profile)   = name !== "" && typedCount >= 1 && total >= 5
missingFor(profile) = isReady ? 0 : Math.max(5 - total, typedCount === 0 ? 1 : 0)
mode(profile)       = total === 0 ? "quickStart" : isReady ? "ready" : "topUp"
```

**Why these numbers:**
- **At least 1 typed answer,** because the guard requires every Venn's main link to quote something typed, and a circle of taps alone produces generic results.
- **At least 5 answers in total,** so a ready circle carries about as much as the old card did.
- Finishing **one theme, including one "in your own words" answer, makes a circle ready.**

### 3.4 The card (the QR snapshot)

The card is built fresh from the profile every time the code is shown, by `cardFromProfile(profile, now)`:

| Part | Rule |
|---|---|
| Typed answers | Up to **6**, the most recently edited ones. These become `A1`…`A6` in a match, in that order. |
| Taps | All of them. |
| Expiry | `e = now + 48h`. Showing your code always gives it a fresh 48 hours; old shared links still expire. Remove the "Refresh card" button; it's no longer needed. |

**QR budget (unchanged): the full link must be ≤ 800 characters.** If it's too long (long non-Latin text, say), drop the oldest included typed answer and try again, down to a minimum of 1. Test this with a profile that has all 12 typed answers at maximum length plus all 40 taps.

**Card schema change:**
- `a` (the typed answers) now holds **1–6** entries, not exactly 5. Old 5-answer links must still decode.
- Server-side, both cards must also pass the readiness check (at least 1 typed answer, at least 5 answers in total). Otherwise return 400 with "That card needs a few more answers."

## 4. Screens

Same design system as `docs/SPEC.md` section 8. One primary button per screen, CSS-only motion, reduced motion respected, tap targets of at least 44px.

### 4.1 The circle graphic (`components/CircleProgress.tsx`)

- A single circle outline (ink, as in the logo) split into **8 equal arc segments, one per theme**, with small gaps between them.
- **Segment states:**
  - **Done** (at least 3 taps answered and at least 1 typed prompt answered in that theme): filled clay. Skipped taps are fine.
  - **Started** (any answer in that theme): clay outline only.
  - **Not started:** sand.
- Put this rule in one function, `themeStatus(profile, themeId)`, used by the graphic, the tiles and the counts.
- The person's first name sits in the centre in Fraunces. Before a name exists, it says "You".
- **Text alternative:** e.g. "Your circle: 3 of 8 themes filled". Never a percentage.
- When a segment fills, it animates in over 400ms. No animation under reduced motion.

### 4.2 Home: three states

**A. No answers yet** (`mode = quickStart`)
- **Top:** the existing intro: logo, "Skip the small talk.", the three steps.
- **Primary button:** "Start my circle (1 min)", which runs the quick start (5 typed prompts, then the name), exactly as the old builder.
- **Below:** the heading "Or start with a theme" and the theme grid.
  - Tapping a theme first asks "What should people call you?" (one screen), then opens the theme.

**B. Some answers, not ready** (`mode = topUp`)
- The circle graphic.
- The line "**2 more answers** and your code is ready."
- **Primary button:** "Finish in 30 seconds", which runs **Almost there** (see 4.4).
- The theme grid below.

**C. Ready** (`mode = ready`)
```
┌──────────────────────────────┐
│ ◯◐◯ venn             Privacy │
│                              │
│  (circle graphic)  Ken       │
│                    3 of 8    │
│                    themes    │
│  ┌──────────┐                │
│  │  [ QR ]  │  Show my code  │  ← QR thumbnail ~200px; tap either = full-screen QR
│  └──────────┘                │
│  Fresh for 48 h · Share link │
│ ──────────────────────────── │
│  Fill your circle            │
│  More to overlap with.       │
│  [theme grid, 2 columns]     │
│  Clear my circle             │  ← quiet text button, at the very bottom
└──────────────────────────────┘
```
- **The QR stays on the first screen of a 360×640 phone.** At an event, speed beats everything.
- **Theme tiles** (as in the theme-packs add-on), using `themeStatus`:
  - Not started: "5 taps + 1 in your words" (or "+ 2" for themes with two typed prompts).
  - Started: "Keep going".
  - Done: a check icon, "Done" and "Edit".

### 4.3 Theme page `/themes/[id]`

This replaces `/packs/[id]`. Add a redirect from the old path.

1. **Taps first:** the 5 tap questions, exactly as on the pack page (tap to answer, auto-advance, Back, Skip, `aria-pressed` buttons).
2. **Then the typed prompt(s):**
   - The label "In your own words", the prompt text in Fraunces and a one-line input (max 60 characters) with its placeholder example.
   - "Next" is enabled once there's a non-space character; "Skip" is always there.
   - Previously typed answers are pre-filled.
3. **Finish screen:**
   - The circle graphic with this theme's segment updating.
   - If the theme is now done: "Food: done."
   - If the user skipped the typed prompt: "Food: saved. Add one line in your own words to complete it." (No guilt, no red.)
   - If this answer made the circle ready for the first time: "**Your code is ready.**" with "Show my code" as the primary button.
   - Otherwise: "Next theme: London life" as the primary button and "Back home" as a quiet one.

**Save after every answer,** so leaving halfway keeps everything.

### 4.4 Scanning someone (`/v#…`), the main behaviour change

| My profile | What happens |
|---|---|
| `ready` | **Straight to matching.** No extra screen. While loading, show the Venn animation plus one line: "Using your circle: 3 themes, 11 answers". |
| `topUp` | The **Almost there** screen. Header: "**Amara** wants to find your Venn. Answer **2** quick questions first." Then show exactly `missingFor(profile)` typed prompts, chosen from prompts not yet answered: first from themes the user has started, then at random. If the name is missing, ask it last. Then go straight to matching. |
| `quickStart` | The existing inline 5-question builder and name step, unchanged. Its answers are saved into the profile. Then go to matching. |

All the other `/v` states (bad link, expired card, your own card, errors) are unchanged. Detect "your own card" by comparing the profile `id`.

**Nudge on the result screen:** if the viewer has fewer than 2 themes done, show one quiet line under "Another one": "Fill your circle for sharper Venns", linking to `/#themes`. Never a pop-up.

### 4.5 Receipts

Typed and tap answers show as in the theme-packs add-on. Typed answers now also show their theme, e.g. "Weekends · A skill that's useless but impressive → I can whistle with two fingers".

## 5. Matching changes

- **Answer IDs:**
  - Typed answers: `A1`…`An` and `B1`…`Bm`, where n and m (1–6) are the numbers of typed answers on each card, in card order.
  - Taps: unchanged (`A-fo2`).
- **Prompt (`match-prompt.ts`):**
  - Replace every hard-coded "A1–A5" / "B1–B5" with the real ranges, e.g. "A1–A3 for Ken, B1–B6 for Amara".
  - Each typed line also shows its theme name: `A2 [Weekends · A skill that's useless but impressive]: …`.
- **Guard:**
  - A "typed answer" is any ID matching `^[AB][1-6]$` that exists on that card.
  - The link-specificity rule (at least one side of `link` cites a typed answer) is unchanged. Re-check its tests with cards that have only 1 typed answer.
- **Demo mode:** works with 1–6 typed answers on each side. Extend the property test (random cards must always pass the guard) so card sizes vary from 1 to 6 typed answers.
- **API route:** the zod schema accepts 1–6 typed answers, then checks readiness for both cards (section 3.4). The body limit is unchanged.

## 6. Privacy page and README

- **Privacy page:** add "Your Circle is saved only on this phone. Your code carries a snapshot of up to 6 written answers plus your theme taps. 'Clear my circle' deletes everything from this phone."
- **README:** add a short "Your Circle" section explaining readiness, the three scan paths and why there's still no database.

## 7. Tests to add

| Area | Tests |
|---|---|
| readiness | A table test over profiles: empty, taps only, 1 typed + 3 taps, 1 typed + 4 taps, 5 typed, no name. Check `isReady`, `missingFor` and `mode` for each. |
| profile | Migration from `venn.card.v1` (answers, name, course and packs kept; old key removed). "Clear my circle". Storage failure falls back to memory, with the private-browsing note. |
| card snapshot | The 6 most recent typed answers are chosen. A fresh `e` each time. All 12 typed at maximum length + all taps → link ≤ 800 characters (oldest dropped). An old 5-answer link still decodes. |
| route | A card with 0 typed answers → 400. A card with 1 typed + 4 taps → 200. A card with 7 typed → 400. |
| prompt and guard | ID ranges match the card sizes (e.g. a 2-typed card never accepts `A3`). Theme names appear in the prompt. |
| components | Home renders each of the three states correctly. `/v` with a ready profile goes straight to matching (the builder never renders). `/v` with a top-up profile shows exactly N questions. `/v` with an empty profile shows the 5-question quick start. Theme page: taps, then typed, then the finish screen. "Your code is ready" appears only the first time. |

## 8. Eval update

- Give the test personas a mix of circle sizes: minimum-ready (1 typed + 4 taps), medium (3 typed + 2 themes) and full (6 typed + all themes).
- Add a "circle size" column to the results file.
- Report the first-try guard pass rate and the human "Good?" rate by size.
- **If minimum-ready circles score clearly worse,** say so plainly in the report. The fix is to raise the readiness threshold (e.g. 2 typed answers), not to change the guard.

## 9. If this ships, update the pitch deck brief

Tell the human to add this to section 0 of `venn-deck-prompt.md` and tick it: `[ ] Your Circle (saved profile; scanning goes straight to the Venn)`. The replacement text for slide 7 is:

- **Headline:** "Fill your circle once. Every scan after that is instant."
- **Visual:** screenshots of the home page with the circle graphic and the theme grid.
- **Three lines:**
  - "Themes on the home page: taps plus one line in your own words."
  - "Ready circle → scanning goes straight to your Venn."
  - "Saved only on your phone. Your code carries a fresh snapshot."
- **Notes:** "First time, you answer five quick questions. After that, Venn remembers you on your phone, and every new person is one scan away."

## 10. Order of work and "done"

| Step | What | Done when |
|---|---|---|
| Y1 | `profile.ts` (+ migration), `readiness.ts`, `cardFromProfile`, card schema change, their tests | Unit tests pass; QR budget test passes |
| Y2 | Themes = taps + typed prompts; `/themes/[id]`; `CircleProgress`; the three home states | Component tests pass; looks right at 360px |
| Y3 | `/v` routing by mode, the Almost-there flow, the result nudge, receipts | Component tests pass |
| Y4 | Prompt, guard, demo mode and route changes | All tests, lint, typecheck and build pass |
| Y5 | Push the branch. The human tests on the **preview URL** with two real phones: (1) an empty phone scans a ready phone and gets the quick start; (2) a phone with only 2 taps gets "Almost there" with 3 questions; (3) two ready phones scan each other and go straight to Venns; (4) the QR scans at 30cm with a full circle. | The human confirms all four |
| Y6 | Eval (section 8), README and privacy page, `docs/DECISIONS.md` entries, merge to `main`, check the production deploy | CI green; live URL updated |

**Decision-log entries:**
1. A profile saved on the phone, not a database: same privacy model.
2. The readiness threshold (1 typed + 5 total) and why.
3. The QR carries the 6 most recent typed answers: the size budget.
4. Showing your code always refreshes its expiry.
5. "Your Circle" as the name.

**Report back with:**
1. The preview URL (then production).
2. The four phone checks.
3. The link length for a full circle.
4. Eval results by circle size.
5. Anything cut.
6. Two judge questions with 2-sentence answers:
   - "Where is my profile stored?"
   - "Why do new users still answer five questions?"