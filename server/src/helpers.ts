export function accessNested<T>(object: unknown, key: string): T {
  const keyParts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = object;

  while (value !== undefined && keyParts.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    value = value[keyParts.shift()!];
  }

  return value;
}

// TODO copied from submission-listing/helpers.ts
const reviewScoreMap = new Map([
  [-3, -6.5],
  [-2, -3.5],
  [-1, -1.5],
  [1, 1.5],
  [2, 3.5],
  [3, 6.5],
]);
export function aggregateReviewScore(reviews: Review[]): number {
  reviews = reviews.filter(
    (review) => review.score >= -3 && review.score <= 3 && review.score !== 0,
  );

  return reviews.length === 0
    ? 0
    : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      reviews.reduce((sum, review) => sum + reviewScoreMap.get(review.score)!, 0) /
        Math.sqrt(reviews.length);
}

export function getParams<K extends string, T extends Partial<Record<K, unknown>>>(
  object: T,
  keys: K[],
): Partial<{ [P in K]: T[K] }> {
  const params: Partial<{ [P in K]: T[K] }> = {};

  for (const key of keys) {
    if (object[key] !== undefined) {
      params[key] = object[key];
    }
  }

  return params;
}

export function groupBy<K extends number | string | null, T>(
  array: unknown[],
  key: string,
  dataKey?: string | null,
  keyIsUnique?: false,
): Record<Exclude<K, null> | 'null', T[]>;
export function groupBy<K extends number | string | null, T>(
  array: unknown[],
  key: string,
  dataKey: string | null,
  keyIsUnique: true,
): Record<Exclude<K, null>, T>;
export function groupBy<
  K extends number | string | null,
  T,
  NullKeyGroup extends string, // = string,
>(
  array: unknown[],
  key: string,
  dataKey: string | null,
  keyIsUnique: boolean,
  nullKeyGroup: NullKeyGroup,
): Record<Exclude<K, null> | NullKeyGroup, T[]>;
export function groupBy(
  array: unknown[],
  key: string,
  dataKey?: string | null,
  keyIsUnique = false,
  nullKeyGroup = 'null',
): Record<number | string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return array.reduce<any>((prev, value) => {
    const groupKey = accessNested<number | string>(value, key) ?? nullKeyGroup;

    if (prev[groupKey] == null) {
      prev[groupKey] = [];
    }

    prev[groupKey].push(dataKey == null ? value : accessNested(value, dataKey));

    if (keyIsUnique) {
      prev[groupKey] = prev[groupKey][0];
    }

    return prev;
  }, {});
}

export function modeBy<K extends string>(array: { [P in K]: number }[], key: K): number {
  const counts: Record<number, number> = { 0: 0 };
  let mode = 0;

  for (const { [key]: value } of array) {
    const count = counts[value] == null ? (counts[value] = 1) : ++counts[value];

    if (count > counts[mode]) {
      mode = value;
    }
  }

  return mode;
}
