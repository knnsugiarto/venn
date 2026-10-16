import { deflateSync, inflateSync } from "fflate";
import { CardSchema, isExpired, type Card } from "./card";
import { PACK_IDS, isPackId, type Packs } from "./packs";

// The card travels after the "#" in the link. Browsers never send that part to
// a server, so the card stays between the two phones.
export const MAX_FRAGMENT = 1500;
export const MAX_LINK = 800;

export type DecodeResult =
  | { ok: true; card: Card }
  | { ok: false; reason: "malformed" | "expired" | "unsupported_version" };

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// Packs on the wire: "fo1203-.st2-101" — pack ID then 5 chars (option index or
// "-" for skipped), joined with "." in PACKS order. Optional 7th array element,
// so links made before packs still decode.
export function encodePacks(p: Packs | undefined): string {
  if (!p) return "";
  return PACK_IDS.filter((id) => p[id]?.some((x) => x !== null))
    .map((id) => id + p[id]!.map((x) => (x === null ? "-" : String(x))).join(""))
    .join(".");
}

/** Returns null if malformed; range checks happen in CardSchema. */
export function decodePacks(s: unknown): Packs | null {
  if (typeof s !== "string" || s.length > 100) return null;
  const out: Packs = {};
  if (!s) return out;
  for (const seg of s.split(".")) {
    const m = /^([a-z]{2})([0-9-]{5})$/.exec(seg);
    if (!m || !isPackId(m[1]!) || out[m[1]]) return null;
    out[m[1]] = [...m[2]!].map((c) => (c === "-" ? null : Number(c)));
  }
  return out;
}

export function encodeCard(card: Card): string {
  // An array, not an object, so field names don't eat QR space.
  const compact: unknown[] = [card.v, card.id, card.n, card.c, card.e, card.a];
  const packs = encodePacks(card.p);
  if (packs) compact.push(packs);
  const raw = new TextEncoder().encode(JSON.stringify(compact));
  const zipped = "1" + toB64url(deflateSync(raw, { level: 9 }));
  const plain = "0" + toB64url(raw);
  return zipped.length <= plain.length ? zipped : plain;
}

export function decodeCard(fragment: string): DecodeResult {
  try {
    const f = fragment.replace(/^#/, "");
    if (!f || f.length > MAX_FRAGMENT) return { ok: false, reason: "malformed" };
    const bytes = fromB64url(f.slice(1));
    const raw = f[0] === "1" ? inflateSync(bytes) : f[0] === "0" ? bytes : null;
    if (!raw) return { ok: false, reason: "malformed" };
    const arr: unknown = JSON.parse(new TextDecoder().decode(raw));
    if (!Array.isArray(arr) || (arr.length !== 6 && arr.length !== 7)) return { ok: false, reason: "malformed" };
    if (arr[0] !== 1) return { ok: false, reason: "unsupported_version" };
    const packs = arr.length === 7 ? decodePacks(arr[6]) : undefined;
    if (packs === null) return { ok: false, reason: "malformed" };
    const parsed = CardSchema.safeParse({ v: arr[0], id: arr[1], n: arr[2], c: arr[3], e: arr[4], a: arr[5], ...(packs ? { p: packs } : {}) });
    if (!parsed.success) return { ok: false, reason: "malformed" };
    if (isExpired(parsed.data)) return { ok: false, reason: "expired" };
    return { ok: true, card: parsed.data };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}

/** Like decodeCard but returns the card even if expired, so we can show the name. */
export function peekName(fragment: string): string | null {
  try {
    const f = fragment.replace(/^#/, "");
    const bytes = fromB64url(f.slice(1));
    const raw = f[0] === "1" ? inflateSync(bytes) : bytes;
    const arr = JSON.parse(new TextDecoder().decode(raw));
    return typeof arr?.[2] === "string" ? arr[2].slice(0, 20) : null;
  } catch {
    return null;
  }
}

export function cardLink(card: Card, origin: string): string {
  return `${origin}/v#${encodeCard(card)}`;
}
