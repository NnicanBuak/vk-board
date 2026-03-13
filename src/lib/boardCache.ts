const TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`bc:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > TTL_MS) {
      localStorage.removeItem(`bc:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(`bc:${key}`, JSON.stringify(entry));
  } catch {
    // Storage quota exceeded — ignore silently
  }
}

export function cacheInvalidate(key: string): void {
  localStorage.removeItem(`bc:${key}`);
}
