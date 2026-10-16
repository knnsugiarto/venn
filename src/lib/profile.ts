import { CardSchema, CARD_TTL_SECONDS, randomId, type Card } from "./card";
import { cardLink, MAX_LINK } from "./codec";
import { cleanPacks, PACKS, type PackAnswers, type PackId } from "./packs";
import { PROMPT_IDS, type PromptId } from "./prompts";
import { themeStatus } from "./readiness";

// Your Circle: the saved profile. Lives only in this phone's localStorage; the
// QR code carries a fresh snapshot of it (cardFromProfile).
export type Profile = {
  v: 1;
  id: string;
  n: string;
  c: string;
  typed: Partial<Record<PromptId, { text: string; at: number }>>;
  taps: Partial<Record<PackId, PackAnswers>>;
};

export const PROFILE_KEY = "venn.profile.v1";
export const OLD_CARD_KEY = "venn.card.v1";

let memory: Profile | null = null;
let storageWorks = true;

export function emptyProfile(): Profile {
  return { v: 1, id: randomId(), n: "", c: "", typed: {}, taps: {} };
}

function isProfile(x: unknown): x is Profile {
  const p = x as Profile;
  return !!p && p.v === 1 && typeof p.id === "string" && /^[a-z0-9]{8}$/.test(p.id) && typeof p.n === "string" && typeof p.c === "string" && typeof p.typed === "object" && typeof p.taps === "object";
}

/** Turns an old card into a profile, keeping name, course, answers and packs. */
export function profileFromCard(card: Card, nowMs = Date.now()): Profile {
  const typed: Profile["typed"] = {};
  // Keep the old order as "most recent first" by spacing timestamps 1 ms apart.
  card.a.forEach(([pid, text], i) => (typed[pid] = { text, at: nowMs - i }));
  return { v: 1, id: card.id, n: card.n, c: card.c, typed, taps: { ...(card.p ?? {}) } };
}

export function loadProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p: unknown = JSON.parse(raw);
      if (isProfile(p)) return (memory = p);
    }
    const old = window.localStorage.getItem(OLD_CARD_KEY);
    if (old) {
      // Old cards may have expired; we only need the answers, so skip expiry checks.
      const parsed = CardSchema.safeParse({ ...JSON.parse(old), e: Math.floor(Date.now() / 1000) });
      if (parsed.success) {
        const p = profileFromCard(parsed.data);
        saveProfile(p);
        window.localStorage.removeItem(OLD_CARD_KEY);
        return p;
      }
    }
    return memory ?? (memory = emptyProfile());
  } catch {
    storageWorks = false;
    return memory ?? (memory = emptyProfile());
  }
}

export function saveProfile(p: Profile) {
  memory = p;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    storageWorks = window.localStorage.getItem(PROFILE_KEY) !== null;
  } catch {
    storageWorks = false;
  }
}

export function clearProfile() {
  memory = null;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(OLD_CARD_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function isStorageAvailable() {
  return storageWorks;
}

export function withTyped(p: Profile, id: PromptId, text: string, nowMs = Date.now()): Profile {
  const typed = { ...p.typed };
  const t = text.trim();
  if (t) typed[id] = { text: t, at: nowMs };
  else delete typed[id];
  return { ...p, typed };
}

export function withTaps(p: Profile, id: PackId, answers: PackAnswers): Profile {
  return { ...p, taps: { ...p.taps, [id]: answers } };
}

/** The QR snapshot: up to 6 most recently edited typed answers (most recent
 * first), all taps, fresh 48h. Drops the oldest typed answer until the link fits. */
export function cardFromProfile(p: Profile, nowMs = Date.now(), origin = "https://venn.lovable.app"): Card | null {
  const typed = PROMPT_IDS.flatMap((id) => {
    const x = p.typed[id];
    return x && x.text.trim() ? [{ id, ...x }] : [];
  }).sort((a, b) => b.at - a.at);
  if (!typed.length || !p.n.trim()) return null;
  const packs = cleanPacks(p.taps as Card["p"]);
  for (let n = Math.min(6, typed.length); n >= 1; n--) {
    const card: Card = { v: 1, id: p.id, n: p.n.trim(), c: p.c.trim(), e: Math.floor(nowMs / 1000) + CARD_TTL_SECONDS, a: typed.slice(0, n).map((x): [PromptId, string] => [x.id, x.text]) };
    if (packs) card.p = packs;
    if (cardLink(card, origin).length <= MAX_LINK || n === 1) return card;
  }
  return null;
}

/** Prompts for "Almost there": unanswered ones from started themes first, then random. */
export function topUpPrompts(p: Profile, n: number, rand = Math.random): PromptId[] {
  const open = PROMPT_IDS.filter((id) => !p.typed[id]?.text.trim());
  const started = PACKS.filter((t) => themeStatus(p, t.id) !== "none").flatMap((t) => t.prompts.filter((id) => open.includes(id)));
  const rest = open.filter((id) => !started.includes(id));
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [rest[i], rest[j]] = [rest[j]!, rest[i]!];
  }
  return [...started, ...rest].slice(0, n);
}

/** Next theme that isn't done, after the given one. */
export function nextTheme(p: Profile, after: PackId) {
  const i = PACKS.findIndex((t) => t.id === after);
  const order = [...PACKS.slice(i + 1), ...PACKS.slice(0, i)];
  return order.find((t) => themeStatus(p, t.id) !== "done") ?? null;
}

/** Saves the quick start's answers into the circle, keeping the circle's id. */
export function mergeQuickStart(p: Profile, card: Card, nowMs = Date.now()): Profile {
  const fromCard = profileFromCard(card, nowMs);
  return { ...p, n: card.n, c: card.c, typed: { ...p.typed, ...fromCard.typed } };
}
