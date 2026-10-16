import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Page } from "@/components/Logo";
import { CardBuilder } from "@/components/CardBuilder";
import { VennGraphic } from "@/components/VennGraphic";
import { VennResultView } from "@/components/VennResult";
import { decodeCard, peekName } from "@/lib/codec";
import { cacheGet, cacheSet } from "@/lib/storage";
import type { Card } from "@/lib/card";
import { AlmostThere } from "@/components/AlmostThere";
import { cardFromProfile, loadProfile, mergeQuickStart, saveProfile, type Profile } from "@/lib/profile";
import { missingFor, mode, themesDone, total } from "@/lib/readiness";
import { matchCards } from "@/lib/match.functions";
import type { MatchResponse, VennResult } from "@/lib/match-schema";

export const Route = createFileRoute("/v")({
  head: () => ({
    // Generic on purpose: the card is after the "#", which never reaches the server.
    meta: [
      { title: "Find your Venn" },
      { name: "description", content: "Someone wants to find what you two have in common." },
      { property: "og:title", content: "Find your Venn" },
      { property: "og:description", content: "Skip the small talk. Open to see what you two share." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Meet,
});

const MAX_VARIANTS = 5;
type Ok = Extract<MatchResponse, { ok: true }>;
type State =
  | { s: "decoding" }
  | { s: "bad" }
  | { s: "expired"; name: string | null }
  | { s: "own" }
  | { s: "build"; them: Card }
  | { s: "topUp"; them: Card; profile: Profile }
  | { s: "matching"; me: Card; them: Card }
  | { s: "error"; me: Card; them: Card; error: string; canUseDemo: boolean }
  | { s: "result"; me: Card; them: Card; res: Ok };

function Meet() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ s: "decoding" });
  const [variant, setVariant] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [using, setUsing] = useState<string | null>(null);

  const run = useCallback(async (me: Card, them: Card, v: number, avoid: string[], mode: "auto" | "demo") => {
    const key = `venn.match.readings-v1.${me.id}.${them.id}.${v}.${mode}`;
    const cached = cacheGet<Ok>(key);
    if (cached) return setState({ s: "result", me, them, res: cached });
    setState({ s: "matching", me, them });
    try {
      const [res] = await Promise.all([
        matchCards({ data: { a: me, b: them, mode, variant: v, avoid: avoid.slice(-12).map((x) => x.slice(0, 200)) } }),
        new Promise((r) => setTimeout(r, 900)), // let the circles finish sliding together
      ]);
      if (res.ok) {
        cacheSet(key, res);
        setState({ s: "result", me, them, res });
      } else setState({ s: "error", me, them, error: res.error, canUseDemo: res.canUseDemo });
    } catch (e) {
      setState({ s: "error", me, them, error: e instanceof Error ? e.message : "Something went wrong. Try again.", canUseDemo: true });
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const decoded = decodeCard(hash);
    if (!decoded.ok) {
      setState(decoded.reason === "expired" ? { s: "expired", name: peekName(hash) } : { s: "bad" });
      return;
    }
    const them = decoded.card;
    const profile = loadProfile();
    if (profile.id === them.id) return setState({ s: "own" });
    const m = mode(profile);
    if (m === "quickStart") return setState({ s: "build", them });
    if (m === "topUp") return setState({ s: "topUp", them, profile });
    setUsing(`Using your circle: ${themesDone(profile)} themes, ${total(profile)} answers`);
    run(cardFromProfile(profile)!, them, 0, [], "auto");
  }, [run]);

  const remember = (r: VennResult) => [r.headline, ...r.starters.map((s) => s.text)];

  return (
    <Page>
      {state.s === "decoding" && <div className="h-[60vh]" />}

      {state.s === "bad" && (
        <Message title="This code didn't scan properly." body="Ask them to show it again." action={<Link to="/" className="btn-primary">Go to my card</Link>} />
      )}
      {state.s === "expired" && (
        <Message title={`${state.name ?? "Their"}'s card has expired.`} body="Ask them to open Venn and show their code again." action={<Link to="/" className="btn-primary">Go to my card</Link>} />
      )}
      {state.s === "own" && (
        <Message title="That's your card!" body="Show it to someone else." action={<Link to="/" className="btn-primary">Show my code</Link>} />
      )}

      {state.s === "build" && (
        <CardBuilder
          header={<><strong>{state.them.n}</strong> wants to find your Venn. Make your card first. It takes about a minute.</>}
          onDone={(card) => {
            const p = mergeQuickStart(loadProfile(), card);
            saveProfile(p);
            run(cardFromProfile(p)!, state.them, 0, [], "auto");
          }}
        />
      )}

      {state.s === "topUp" && (
        <AlmostThere
          profile={state.profile}
          header={<><strong>{state.them.n}</strong> wants to find your Venn. Answer <strong>{missingFor(state.profile)}</strong> quick {missingFor(state.profile) === 1 ? "question" : "questions"} first.</>}
          onDone={(p) => run(cardFromProfile(p)!, state.them, 0, [], "auto")}
        />
      )}

      {state.s === "matching" && (
        <div className="py-10 text-center">
          <VennGraphic state="matching" left={state.me.n} right={state.them.n} />
          <p className="mt-6 text-lg" aria-live="polite">Finding what you two share…</p>
          {using && <p className="mt-2 text-sm text-ink-soft">{using}</p>}
        </div>
      )}

      {state.s === "error" && (
        <Message
          title="Hmm, that didn't work."
          body={state.error}
          action={
            <div className="space-y-2">
              <button className="btn-primary" onClick={() => run(state.me, state.them, variant, seen, "auto")}>Try again</button>
              {state.canUseDemo && (
                <button className="btn-quiet w-full" onClick={() => run(state.me, state.them, variant, seen, "demo")}>Use demo mode instead</button>
              )}
            </div>
          }
        />
      )}

      {state.s === "result" && (
        <VennResultView
          key={variant}
          me={state.me}
          them={state.them}
          result={state.res.result}
          demo={state.res.source === "demo"}
          notice={state.res.notice}
          onAnother={
            variant + 1 < MAX_VARIANTS
              ? () => {
                  const avoid = [...seen, ...remember(state.res.result)];
                  setSeen(avoid);
                  setVariant(variant + 1);
                  run(state.me, state.them, variant + 1, avoid, state.res.source === "demo" ? "demo" : "auto");
                  window.scrollTo({ top: 0 });
                }
              : null
          }
          nudge={themesDone(loadProfile()) < 2}
          onShowCode={() => navigate({ to: "/" })}
        />
      )}
    </Page>
  );
}

function Message({ title, body, action }: { title: string; body: string; action: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] flex-col py-10" role="alert">
      <VennGraphic state="idle" />
      <h1 className="mt-8 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-ink-soft">{body}</p>
      <div className="flex-1" />
      <div className="mt-8">{action}</div>
    </div>
  );
}
