import { systemLog } from './log.js';

const cacheStore: Partial<Record<string, { cachedAt: number; value: unknown } | null>> = {};
const usedBy: Partial<Record<string, string[]>> = {};
const usedByFilled = new Set<string>();

export function cache<T>(
  { dependsOn, key, ttlSeconds }: { dependsOn?: string[]; key: string; ttlSeconds: number },
  fn: () => T,
): T {
  if (!usedByFilled.has(key)) {
    for (const dependency of dependsOn ?? []) {
      (usedBy[dependency] ??= []).push(key);

      if (!(dependency in cacheStore)) {
        systemLog(
          `Cache entry "${key}" depends on nonexistent entry "${dependency}"`,
          SyslogLevel.err,
        );
      }
    }

    usedByFilled.add(key);
  }

  const cacheItem = cacheStore[key];
  const now = Date.now() / 1000;

  if (cacheItem != null) {
    if (now < cacheItem.cachedAt + ttlSeconds) {
      return cacheItem.value as T;
    }

    deleteCache(key);
  }

  const value = fn();
  cacheStore[key] = { cachedAt: now, value };
  return value;
}

export function deleteCache(key: string): void {
  if (!(key in cacheStore)) {
    systemLog(`Tried to delete nonexistent cache entry "${key}"`, SyslogLevel.warning);
  }

  cacheStore[key] = null;
  usedBy[key]?.forEach(deleteCache);
}
