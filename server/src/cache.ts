const cacheStore = new Map<string, { cachedAt: number; value: unknown }>();

export function cache<T>(key: string, ttlSeconds: number, fn: () => T): T {
  const now = Date.now() / 1000;
  const cacheItem = cacheStore.get(key);

  if (cacheItem != null && now < cacheItem.cachedAt + ttlSeconds) {
    return cacheItem.value as T;
  }

  const value = fn();
  cacheStore.set(key, { cachedAt: now, value });
  return value;
}

export function deleteCache(key: string): void {
  cacheStore.delete(key);
}
