# Venn

**Skip the small talk.** Venn helps students who've just met get past "So what do you study?". Each person makes a quick card: five short answers, first name only. Then you scan each other's QR code with your phone camera. Claude finds the surprising thing you share and writes three conversation starters and a two-minute challenge just for you two.

Built for the Claude Campus Hackathon + Showcase (UCL Entrepreneurs × Claude Builder Club UCL), Better Student Life track.

## Run it locally

Needs [Bun](https://bun.sh) (or Node 22 with `npx`).

```sh
bun install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY, or leave it empty for demo mode
bun run dev
```

Tests: `bun run test`

## Deploy on Vercel

1. Import this repository in Vercel. Leave Root Directory empty; Vercel installs with Bun (from `bun.lock`) and runs `vite build`.
2. Add `ANTHROPIC_API_KEY` under **Settings > Environment Variables**, then redeploy. Without it the app runs in demo mode.
3. Set a spend limit in the Claude Console (Settings > Billing > Spend limits).

The build uses TanStack Start + Nitro, which detects Vercel automatically and writes `.vercel/output`.

## How it works

- Your card lives inside your QR link (after the `#`) and on your phone. There is no database and no sign-in.
- When you scan someone, both cards go to one server function, which asks Claude for a structured reply. Our code (`src/lib/guard.ts`) checks every line against what you both actually wrote before you see it.
- Without an API key, a rule-based demo mode runs instead, clearly labelled "not Claude".

Design notes and decisions: `docs/` and `AGENTS.md`.

## Built with

TanStack Start, React, TypeScript, Tailwind CSS, Claude API (Haiku 5.5). Built with help from Lovable and Claude; the team directed, reviewed and tested the code.

An independent student project. Not affiliated with or endorsed by UCL or Anthropic.
