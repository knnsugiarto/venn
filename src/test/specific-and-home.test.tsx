import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createCard } from "@/lib/card";
import { answerList, findAnswer } from "@/lib/answers";
import { demoMatch, phrase } from "@/lib/demo-match";
import { checkMatch } from "@/lib/guard";
import { SYSTEM_PROMPT } from "@/lib/match-prompt";
import { clearProfile, OLD_CARD_KEY } from "@/lib/profile";
import { Page } from "@/components/Logo";
import { Home } from "@/routes/index";
import { VennResultView } from "@/components/VennResult";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const real = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...real,
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    createFileRoute: () => (options: object) => ({ ...options, useSearch: () => ({}) }),
  };
});
vi.mock("@/components/QrImage", () => ({ QrImage: () => <div aria-label="QR code" /> }));

const ken = createCard({
  id: "kenaaaa1",
  n: "Ken",
  c: "Economics",
  a: [
    ["fd", "Hot pot with far too much chilli"],
    ["us", "I can whistle with two fingers"],
    ["rc", "Brooklyn Nine-Nine, fifth time round"],
    ["ob", "Ranking every bakery on my bus route"],
    ["hm", "Jakarta: the traffic is a lifestyle"],
  ],
});
const amara = createCard({
  id: "amaraaa2",
  n: "Amara",
  c: "",
  a: [
    ["fd", "Jollof rice, party style"],
    ["sg", "Dancing Queen, every single time"],
    ["vs", "Primrose Hill at sunset"],
    ["jb", "Dressed as a giant carrot at a market"],
    ["ln", "Fresh pasta by hand"],
  ],
});

beforeEach(() => {
  clearProfile();
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe("specific, not vague", () => {
  it("demo starters name what each person actually wrote, for every variant", () => {
    const A = answerList(ken, "A");
    const B = answerList(amara, "B");
    for (let v = 0; v < 5; v++) {
      const out = demoMatch(ken, amara, v);
      expect(checkMatch(out, ken, amara).ok).toBe(true);
      for (const s of out.starters) {
        const text = s.text.toLowerCase();
        expect(text).toContain(phrase(findAnswer(A, s.a.answer_id)!.text).toLowerCase());
        expect(text).toContain(phrase(findAnswer(B, s.b.answer_id)!.text).toLowerCase());
        // No vague category-only lines like the old "your useless-but-impressive skill meets a dance song".
        expect(text).not.toMatch(/useless-but-impressive|meets a dance song/);
      }
    }
  });
  it("demo phrases cut cleanly and keep names capitalised", () => {
    expect(phrase("Dressed as a giant carrot at a market")).toBe("dressed as a giant carrot");
    expect(phrase("Primrose Hill at sunset")).toBe("Primrose Hill at sunset");
    expect(phrase("Jakarta: the traffic is a lifestyle")).toBe("Jakarta");
    expect(phrase("I can whistle with two fingers")).toBe("I can whistle with two fingers");
    expect(phrase('"Spirited Away"')).toBe("Spirited Away");
  });
  it("tells Claude to name specific things and use people's words", () => {
    expect(SYSTEM_PROMPT).toContain("Be specific, never vague");
    expect(SYSTEM_PROMPT).toContain("Use their words");
    expect(SYSTEM_PROMPT).toMatch(/course/);
  });
});

describe("always a way home", () => {
  it("every non-home page has a visible Home link", () => {
    render(
      <Page>
        <p>step</p>
      </Page>,
    );
    const home = screen.getByRole("link", { name: "Back to home" });
    expect(home).toHaveAttribute("href", "/");
    expect(home).toHaveTextContent("Home");
  });
  it("the result screen links home", () => {
    render(
      <VennResultView
        me={ken}
        them={amara}
        result={demoMatch(ken, amara)}
        demo
        notice={null}
        onAnother={null}
        nudge
        onShowCode={() => {}}
      />,
    );
    expect(screen.getByText("Expand your circle for sharper Venns (optional)")).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("Expand your circle (Optional)", () => {
  it("home shows the renamed, optional section", async () => {
    window.localStorage.setItem(OLD_CARD_KEY, JSON.stringify(ken));
    render(<Home />);
    expect(
      await screen.findByRole("heading", { name: "Expand your circle (Optional)" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Fill your circle/)).toBeNull();
  });
});
