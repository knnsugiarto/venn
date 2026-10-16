import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy · Venn" },
      { name: "description", content: "How Venn handles your card: no database, first name only, cards expire in 48 hours." },
      { property: "og:title", content: "Venn privacy, in plain English" },
      { property: "og:description", content: "No database. First name only. Cards expire after 48 hours." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

const POINTS = [
  "Your card lives inside your QR link and on your phone. We have no database.",
  "Your Circle is saved only on this phone. Your code carries a snapshot of up to 6 written answers plus your theme taps. 'Clear my circle' deletes everything from this phone.",
  "Theme pack answers are stored the same way as your card: on your phone and inside your QR link, never on our server.",
  "When you scan someone, both cards are sent to our server once, which sends them to Anthropic's Claude API to write your Venn. Our server doesn't save or log them.",
  "First name only, and cards expire after 48 hours. But anyone you show your code to can see your answers, so don't write anything private.",
  "Not a dating app, and no scores.",
  "An independent student project, not affiliated with or endorsed by UCL or Anthropic.",
];

function Privacy() {
  return (
    <Page>
      <h1 className="mt-6 text-[36px] font-semibold">Privacy, in plain English</h1>
      <ol className="mt-8 space-y-5">
        {POINTS.map((p, i) => (
          <li key={i} className="flex gap-4">
            <span className="font-display text-xl font-semibold text-clay-ink">{i + 1}</span>
            <p>{p}</p>
          </li>
        ))}
      </ol>
    </Page>
  );
}
