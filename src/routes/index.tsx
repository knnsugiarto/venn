import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page, LogoMark } from "@/components/Logo";
import { ThemeGrid } from "@/components/ThemeGrid";
import { CircleProgress } from "@/components/CircleProgress";
import { MyCode } from "@/components/MyCode";
import { clearProfile, emptyProfile, loadProfile, type Profile } from "@/lib/profile";
import { missingFor, mode } from "@/lib/readiness";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { ready?: 1 } => (s["ready"] === 1 || s["ready"] === "1" ? { ready: 1 } : {}),
  head: () => ({
    meta: [
      { title: "Venn · Skip the small talk" },
      { name: "description", content: "Fill your circle once, scan someone, and get the surprising thing you two have in common." },
      { property: "og:title", content: "Venn · Skip the small talk" },
      { property: "og:description", content: "Scan each other's code. Get the thing you share and three questions only you two could ask." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

export function Home() {
  const { ready } = Route.useSearch();
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  useEffect(() => setProfile(loadProfile()), []);
  // The profile loads after first render, so scroll to #themes once it's there.
  useEffect(() => {
    if (profile && window.location.hash === "#themes") document.getElementById("themes")?.scrollIntoView();
  }, [profile]);

  if (!profile) return <Page><div className="h-[60vh]" /></Page>;
  const m = mode(profile);
  const clear = <ClearCircle onClear={() => { clearProfile(); setProfile(emptyProfile()); }} />;

  if (m === "ready")
    return (
      <Page minimal>
        <MyCode profile={profile} celebrate={!!ready} />
        <ThemeGrid profile={profile} title="Fill your circle" />
        {clear}
      </Page>
    );

  if (m === "topUp") {
    const n = missingFor(profile);
    return (
      <Page minimal>
        <div className="flex flex-col items-center py-6 text-center">
          <CircleProgress profile={profile} />
          <p className="mt-6 text-lg">
            {n > 0 ? <><strong>{n} more {n === 1 ? "answer" : "answers"}</strong> and your code is ready.</> : <>Add your name and your code is ready.</>}
          </p>
          <Link to="/make" className="btn-primary mt-6">Finish in 30 seconds</Link>
        </div>
        <ThemeGrid profile={profile} title="Fill your circle" />
        {clear}
      </Page>
    );
  }

  // There is no sign-in, by design. A scanned link goes directly to /v's quick start.
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col px-5">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <LogoMark className="h-24 w-36 anim-drift-l" />
        <h1 className="mt-4 text-[64px] font-semibold">venn</h1>
        <p className="mt-6 text-lg text-ink-soft">Skip the small talk.</p>
        <p className="mt-2 text-[15px] text-ink-soft">Make a card. Scan someone. Talk.</p>
      </div>
      <div className="sticky bottom-0 bg-paper pb-4 pt-4 text-center">
        <Button asChild className="btn-primary"><Link to="/make" role="button">Start</Link></Button>
        <Link to="/privacy" className="mt-2 inline-flex min-h-11 items-center text-xs text-ink-soft underline">Privacy</Link>
      </div>
    </main>
  );
}

function ClearCircle({ onClear }: { onClear: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="mt-10 pb-6 text-center text-sm">
      {confirm ? (
        <div className="flex items-center justify-center gap-2">
          <span>Delete your circle from this phone?</span>
          <button className="btn-quiet text-clay-ink" onClick={onClear}>Yes, clear it</button>
          <button className="btn-quiet" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <button className="btn-quiet" onClick={() => setConfirm(true)}>Clear my circle</button>
      )}
    </div>
  );
}
