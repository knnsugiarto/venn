// In-memory limits: a speed bump, not a guarantee. Each server instance has its
// own memory and restarts reset it. The real cap is the Anthropic Console spend limit.
const PER_IP = 20;
const IP_WINDOW = 10 * 60 * 1000;
const GLOBAL = 300;
const GLOBAL_WINDOW = 60 * 60 * 1000;

const hits = new Map<string, number[]>();
let globalHits: number[] = [];

export function allow(ip: string, now = Date.now()): boolean {
  globalHits = globalHits.filter((t) => now - t < GLOBAL_WINDOW);
  const mine = (hits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW);
  if (mine.length >= PER_IP || globalHits.length >= GLOBAL) {
    hits.set(ip, mine);
    return false;
  }
  mine.push(now);
  hits.set(ip, mine);
  globalHits.push(now);
  if (hits.size > 5000) hits.clear(); // keep memory bounded
  return true;
}
