import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Page } from "@/components/Logo";
import { CircleProgress } from "@/components/CircleProgress";
import { NameStep, StepTop, TypedStep } from "@/components/Steps";
import { loadProfile, nextTheme, saveProfile, withTaps, withTyped, type Profile } from "@/lib/profile";
import { getPack, isPackId, type PackAnswers, type PackId } from "@/lib/packs";
import { isReady, themeStatus } from "@/lib/readiness";

export const Route = createFileRoute("/themes/$id")({
  beforeLoad: ({ params }) => {
    if (!isPackId(params.id)) throw notFound();
  },
  head: ({ params }) => {
    const name = isPackId(params.id) ? getPack(params.id).name : "Theme";
    return {
      meta: [
        { title: `${name} · Fill your circle · Venn` },
        { name: "description", content: `Five quick taps and a line in your own words about ${name.toLowerCase()}.` },
        { property: "og:title", content: `${name} · Venn` },
        { property: "og:description", content: "Fill your circle. More to overlap with." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ThemePage,
});

function ThemePage() {
  const { id } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => setProfile(loadProfile()), [id]);
  if (!profile || !isPackId(id)) return <Page><div className="h-[60vh]" /></Page>;
  return <Page><ThemeFlow key={id} themeId={id} initial={profile} /></Page>;
}

export function ThemeFlow({ themeId, initial }: { themeId: PackId; initial: Profile }) {
  const theme = getPack(themeId);
  const [p, setP] = useState(initial);
  const [wasReady] = useState(() => isReady(initial));
  const [askName] = useState(() => !initial.n.trim());
  // Steps: [name], 5 taps, typed prompts, finish.
  const first = askName ? -1 : 0;
  const [step, setStep] = useState(first);
  const taps: PackAnswers = p.taps[themeId] ?? [null, null, null, null, null];
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const finish = 5 + theme.prompts.length;
  const save = (next: Profile) => { saveProfile(next); setP(next); };
  const back = step > first ? () => setStep(step - 1) : undefined;

  if (step === -1) {
    return (
      <div className="flex min-h-[70vh] flex-col">
        <StepTop dots={0} at={0} label={theme.name} />
        <NameStep initial="" onNext={(n) => { save({ ...p, n }); setStep(0); }} />
      </div>
    );
  }

  if (step >= finish) {
    const status = themeStatus(p, themeId);
    const nowReady = isReady(p) && !wasReady;
    const nxt = nextTheme(p, themeId);
    return (
      <div className="flex min-h-[70vh] flex-col py-6 text-center">
        <div className="mx-auto mt-6"><CircleProgress profile={p} /></div>
        <h1 className="mt-6 text-3xl font-semibold">{status === "done" ? `${theme.name}: done.` : `${theme.name}: saved.`}</h1>
        {status !== "done" && <p className="mt-2 text-ink-soft">Add one line in your own words to complete it.</p>}
        {nowReady && <p className="font-display mt-6 text-2xl font-medium">Your code is ready.</p>}
        <div className="flex-1" />
        <div className="mt-8 space-y-2">
          {nowReady ? (
            <Link to="/" search={{ ready: 1 }} className="btn-primary">Show my code</Link>
          ) : nxt ? (
            <>
              <Link to="/themes/$id" params={{ id: nxt.id }} className="btn-primary">Next theme: {nxt.name}</Link>
              <Link to="/" className="btn-quiet w-full">Back home</Link>
            </>
          ) : (
            <Link to="/" className="btn-primary">Back home</Link>
          )}
        </div>
      </div>
    );
  }

  if (step >= 5) {
    const prompt = theme.prompts[step - 5]!;
    return (
      <div className="flex min-h-[70vh] flex-col">
        <StepTop onBack={back} label={theme.name} dots={finish} at={step} />
        <TypedStep
          key={prompt}
          prompt={prompt}
          initial={p.typed[prompt]?.text ?? ""}
          onNext={(t) => { save(withTyped(p, prompt, t)); setStep(step + 1); }}
          onSkip={() => setStep(step + 1)}
        />
      </div>
    );
  }

  function choose(value: number | null) {
    save(withTaps(p, themeId, taps.map((x, i) => (i === step ? value : x))));
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (timer.current) clearTimeout(timer.current);
    const go = () => setStep((s) => s + 1);
    if (value === null || reduced) go();
    else timer.current = setTimeout(go, 250);
  }

  const question = theme.questions[step]!;
  return (
    <div className="flex min-h-[70vh] flex-col">
      <StepTop onBack={back} label={theme.name} dots={finish} at={step} />
      <p className="mt-6 text-sm text-ink-soft">Question {step + 1} of 5</p>
      <h1 id="tap-q" className="font-display mt-2 text-[30px] font-medium">{question.q}</h1>
      <div role="group" aria-labelledby="tap-q" className="mt-6 space-y-3">
        {question.options.map((opt, i) => {
          const on = taps[step] === i;
          return (
            <button key={opt} type="button" aria-pressed={on} onClick={() => choose(i)} className={`block min-h-14 w-full rounded-full border-2 px-6 py-3 text-left text-lg font-medium transition-colors ${on ? "border-clay bg-clay text-ink" : "border-sand bg-paper hover:border-ink"}`}>
              {opt}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn-quiet -ml-3 mt-6 self-start" onClick={() => choose(null)}>Skip this one</button>
    </div>
  );
}
