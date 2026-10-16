# Smarter reading decisions

## Implemented scope
Parts 1, 2, 3 and 5 only. Precedence: ADDON-open-questions-2 > ADDON-open-questions > ADDON-your-circle > ADDON-theme-packs > SPEC. Both uploaded briefs are saved in full. No Part 4 or Part 6 question-bank, MCQ Other, migration, readiness, body-limit or snapshot changes.

- Existing prompt IDs and meaning remain unchanged; unique section 4.2 placeholders replace repeated examples.
- New-user landing is minimal and deliberately has no sign-in. Returning home shows plain rows. Counts remain out of 6/7 (five existing taps plus one/two written prompts), not four, because the four-question bank belongs to excluded Part 4.
- Readings are first in both output schemas, using the existing shared answer-ID list. Model output budget is 1400, as requested. Existing raw-fetch Claude model, endpoint and timeout remain unchanged.
- Facts remain hard. S1–S4 style rules are soft after one quality retry, choosing the fact-safe reply with fewer issues. Fact failure after the second attempt sets 502. Style logs contain only codes.
- Receipt answers are shown without added quotation marks; hidden evidence is used only to check and highlight words. Cited answers also show their reading.
- Existing session caches are invalidated by a versioned result namespace rather than showing pre-readings replies.
- Branch/Vercel instructions map to the current Smarter reading draft and Lovable hosting. No production URL exists yet; nothing was accepted or published by the agent.

## Verification and explicit gaps
- Baseline: 49 tests passed and a 360px make-card → scan → Venn flow passed before implementation (demo).
- Context set: all ten pairs added, with nearest existing prompt-ID mapping and expected kinds. Runner executes each three times and reports kind accuracy, first fact/style pass rates, S1–S4 counts, remaining style problems, median end-to-end latency, and human gloss/naturalness columns.
- **Live Claude evaluation blocked:** ANTHROPIC_API_KEY is absent in this draft. No substitute provider/model was tested. Kind accuracy ≥90%, first-style pass ≥85%, pair 8 not linking on Zorblax, pair 9 not inventing facts about Tom, and <6s latency remain unverified. Demo readings explicitly say simple rules, not Claude.
- **Human checks pending:** review five Claude Venns for naturalness, check two real phones and QR scanning from 30cm. Browser verification does not prove physical scanning.
- **Production gate unavailable:** app is not published. Verification uses the running draft, not a claimed production deploy.
- Deck/pitch files are absent. Team should screenshot the new landing and describe receipts as checked against real answers, not quotations; do not claim a Pattinson/Twilight example until a real Claude test produces it.

## Judge answers
**How does it know what my answer means?** Claude uses the question as context but interprets the answer itself first, including widely known names and other languages. The receipts expose that reading so students can inspect it.

**What stops it making things up about a celebrity or a friend?** The instructions allow only widely known public facts, ban private-person speculation and tell Claude not to build on guesses. The guard checks real evidence, readings and lengths, but it does not prove every semantic interpretation true; human review is still needed.