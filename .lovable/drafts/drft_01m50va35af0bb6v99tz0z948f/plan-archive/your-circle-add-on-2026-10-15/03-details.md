## Order of work (brief section 10)
1. **Y1 data:** `profile.ts` (key `venn.profile.v1`, migration from `venn.card.v1` then delete, memory fallback, clear), `readiness.ts` (typedCount/total/isReady/missingFor/mode), `cardFromProfile` (6 most recent typed, all taps, fresh 48h, drop oldest until link ≤ 800, min 1). Card `a` becomes 1–6; old 5-answer links still decode.
2. **Y2 screens:** themes map typed prompts (fo: fd,mk · ln: wd,vs · ms: sg · st "Study & work": ln,jb · wk: ob,us · sc: rc · tp: op · tv: hm), comment on the `ln` quirk. `themeStatus` shared by `CircleProgress` (8 arcs, name/“You” centre, count alt text, 400ms fill, reduced motion), tiles and counts. `/themes/$id` replaces `/packs/$id` (old path redirects), saving after every answer. Home's three states; remove Refresh card; "Show my code" full-screen.
3. **Y3 scan:** `/v` routes by mode, "Using your circle: X themes, Y answers" while loading, Almost-there picks prompts from started themes first, name last; own-card check by profile id; result nudge to `/#themes` when under 2 themes done; receipts show theme names.
4. **Y4 matching:** dynamic A1..An / B1..Bm ranges and `[Theme · prompt]` lines in the Claude prompt; guard only accepts typed IDs that exist on that card; demo matcher handles 1–6; server rejects unready cards with "That card needs a few more answers."; property test varies sizes 1–6.
5. **Docs:** privacy line, README "Your Circle" section, five decision rules in AGENTS.md.

## Tests
Every row in brief section 7: readiness table, profile migration/clear/fallback, snapshot selection and 800-char budget with all 12 typed at max + 40 taps, route accept/reject (0 typed, 1+4 taps, 7 typed), prompt/guard ranges, plus component tests for home states, `/v` modes and the theme finish screen.

## Verify and report
Run at 360x640 in a browser: new to ready via a theme, scan in all three modes. Report the preview link, full-circle link length, what was cut (eval section 8, deck update, real-phone checks Y5 are for the team), the two judge Q&As, and the Friday 10:00 London hard stop.
