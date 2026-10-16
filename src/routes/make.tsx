import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Page } from "@/components/Logo";
import { CardBuilder } from "@/components/CardBuilder";
import { AlmostThere } from "@/components/AlmostThere";
import { loadProfile, mergeQuickStart, saveProfile, type Profile } from "@/lib/profile";
import { mode } from "@/lib/readiness";

export const Route = createFileRoute("/make")({
  head: () => ({
    meta: [
      { title: "Start your circle · Venn" },
      { name: "description", content: "Answer five quick prompts and get your Venn QR code." },
      { property: "og:title", content: "Start your Venn circle" },
      { property: "og:description", content: "Five quick prompts, one QR code, about a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Make,
});

function Make() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  useEffect(() => {
    const p = loadProfile();
    if (mode(p) === "ready") navigate({ to: "/", replace: true });
    else setProfile(p);
  }, [navigate]);
  if (!profile) return <Page><div className="h-[60vh]" /></Page>;
  const done = () => navigate({ to: "/", search: { ready: 1 } });
  return (
    <Page>
      {mode(profile) === "quickStart" ? (
        <CardBuilder onCancel={() => navigate({ to: "/" })} onDone={(card) => { saveProfile(mergeQuickStart(profile, card)); done(); }} />
      ) : (
        <AlmostThere profile={profile} onCancel={() => navigate({ to: "/" })} onDone={done} />
      )}
    </Page>
  );
}
