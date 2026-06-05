/**
 * Rate limiter en mémoire.
 * En serverless (Vercel), la Map est partagée dans le même worker process.
 * Pour une persistance cross-instance, remplace par Upstash Redis.
 */

type Entry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Entry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { blocked: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, remaining: MAX_ATTEMPTS - 1 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { blocked: true, remaining: 0 };
  }

  entry.count++;
  return { blocked: false, remaining: MAX_ATTEMPTS - entry.count };
}

export function resetRateLimit(key: string): void {
  store.delete(key);
}
