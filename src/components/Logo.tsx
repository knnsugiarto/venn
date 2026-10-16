import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "h-7 w-11" }: { className?: string }) {
  // Circles r=28, centres 28 apart, so the lens fits exactly.
  return (
    <svg viewBox="0 0 100 64" className={className} aria-hidden="true">
      <path d="M50 7.75 A28 28 0 0 1 50 56.25 A28 28 0 0 1 50 7.75 Z" className="fill-clay" />
      <circle cx="36" cy="32" r="28" fill="none" className="stroke-ink" strokeWidth="3" />
      <circle cx="64" cy="32" r="28" fill="none" className="stroke-ink" strokeWidth="3" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between py-4">
      <Link to="/" className="flex items-center gap-2 rounded-full" aria-label="Venn home">
        <LogoMark />
        <span className="font-display text-2xl font-semibold">venn</span>
      </Link>
      <Link to="/privacy" className="btn-quiet text-sm">Privacy</Link>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-12 border-t border-sand py-6 text-center text-sm text-ink-soft">
      Made at the Claude Campus Hackathon · Uses Claude by Anthropic · Not affiliated with or endorsed by UCL or Anthropic ·{" "}
      <Link to="/privacy" className="underline underline-offset-2">Privacy</Link>
    </footer>
  );
}

export function Page({ children, minimal = false }: { children: React.ReactNode; minimal?: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5">
      {!minimal && <Header />}
      <main className="flex-1">{children}</main>
      {!minimal && <Footer />}
    </div>
  );
}
