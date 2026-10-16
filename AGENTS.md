<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Venn decisions
- Cards travel only in the link fragment (`/v#...`) and localStorage; no database, because the product promises nothing is stored server-side.
- `src/lib/match.functions.ts` is the only server endpoint; Claude is called by raw fetch from `claude.server.ts` (worker-safe, no SDK), and every reply must pass `guard.ts` before display.
- Demo matcher runs whenever `ANTHROPIC_API_KEY` is absent or demo mode is requested, and must pass the same guard.
- Adapted from the brief's Next.js/Vercel stack to TanStack Start on Lovable hosting; the original brief is kept in `docs/SPEC.md`.
- Theme pack answers ride in the card as optional `p` (7th link element); every answer ID comes from `src/lib/answers.ts` so prompt, guard, demo and receipts can't drift. Pack spec: `docs/ADDON-theme-packs.md`.
- Your Circle profile lives only in localStorage (`src/lib/profile.ts`), never a database, keeping the same privacy model as cards.
- Readiness rules live only in `src/lib/readiness.ts` (name, ≥1 typed, ≥5 total) and the server reuses them, so client and server can't disagree.
- The QR snapshot carries the most recent typed answers (max 6) and drops the oldest until the link fits the QR budget.
- Showing your code always rebuilds it with a fresh 48h expiry, so there is no refresh button.
- "Your Circle" is the user-facing name for the profile; code calls it `profile`.
- Contextual `readings` come first in both model schemas and must cover every cited answer exactly once; interpretation precedes linking and receipts expose it.
- Evidence stays in `quote` fields for checking/highlighting only, never in result chips; visible writing and factual evidence have different jobs.
- `match-attempts.ts` owns the single quality retry: fact failures block output, style-only failures choose the fact-safe candidate with fewer issues after the retry, so style cannot break the demo.
- Style diagnostics log only S1–S4 codes, never answers or generated text, preserving the privacy promise.
- The result session-cache namespace changes with the required output shape, preventing old cached results from bypassing the readings guard.
- Preserve existing tap packs, readiness thresholds and QR limits for the smarter-reading add-on; Parts 4 and 6 are separate, unimplemented scope.
- The first-time landing has no sign-in and the returning home uses plain theme rows whose counts reflect existing questions, not the deferred question-bank redesign.
- Evaluation scripts under `eval/` are offline operator tools, not application endpoints; no additional server route or stored student data is introduced.
- Keep automated tests in `.tsx` files to follow the project convention.
