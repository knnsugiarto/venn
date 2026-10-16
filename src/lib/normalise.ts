// Shared by the guard and the demo matcher, so "Jakarta’s" and "jakarta's" count as the same text.
export function normalise(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Trims surrounding punctuation and quote marks a model might wrap a quote in. */
export function normaliseQuote(s: string): string {
  return normalise(s).replace(/^[\s"'.,!?;:()«»‹›-]+|[\s"'.,!?;:()«»‹›-]+$/g, "");
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
