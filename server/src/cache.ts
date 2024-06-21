const cacheStore = new Map<string, { cachedAt: number; value: unknown }>();
const usedBy = new Map<string, string[]>();

export function cache<T>(
  { dependsOn, key, ttlSeconds }: { dependsOn?: string[]; key: string; ttlSeconds: number },
  fn: () => T,
): T {
  // If this key isn't in the dependency map, then create it, and set up all of
  // its reverse dependencies.
  if (!usedBy.has(key)) {
    usedBy.set(key, []);

    for (const dependency of dependsOn ?? []) {
      usedBy.get(dependency)?.push(key);
    }
  }

  const cacheItem = cacheStore.get(key);
  const now = Date.now() / 1000;

  if (cacheItem != null) {
    if (now < cacheItem.cachedAt + ttlSeconds) {
      return cacheItem.value as T;
    }

    deleteCache(key);
  }

  const value = fn();
  cacheStore.set(key, { cachedAt: now, value });
  return value;
}

export function deleteCache(key: string): void {
  cacheStore.delete(key);

  for (const reverseDependency of usedBy.get(key) ?? []) {
    deleteCache(reverseDependency);
  }
}
