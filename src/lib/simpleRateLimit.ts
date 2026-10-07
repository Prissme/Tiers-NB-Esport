// Limiteur en mémoire (par instance) : suffisant pour freiner le spam de likes / bio.
const hits = new Map<string, number[]>();

export function allow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    hits.forEach((times, k) => {
      if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    });
  }
  return true;
}
