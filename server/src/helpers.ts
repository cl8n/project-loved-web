import type { User } from 'loved-bridge/tables';
import type { Osu } from './osu.js';

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

export async function cleanNominationDescription(
  description: string | null,
  osu: Osu,
): Promise<string | null> {
  if (description == null) {
    return null;
  }

  description = description
    .trim()
    .replace(/\r\n?/g, '\n')
    .replace(/^ +| +$/gm, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/½/g, '1/2')
    .replace(/⅓/g, '1/3')
    .replace(/¼/g, '1/4')
    .replace(/⅙/g, '1/6')
    .replace(/⅛/g, '1/8')
    .replace(/\b(\d+) ?k\b/gi, '$1K')
    .replace(/\b(\d+) ?bpm\b/gi, '$1 BPM')
    .replace(/o2jam/gi, 'O2Jam')
    .replace(/\[url=https?:\/\/osu\.ppy\.sh(\/wiki\/[^\]]+)\]/g, '[url=$1]');

  let profileMatchStart = 0;

  for (;;) {
    // TODO annotation requirement is a bug..?
    const profileMatchInput: string = description.slice(profileMatchStart);
    const profileMatch = profileMatchInput.match(/\[profile(?:=(\d+))?\](.+?)\[\/profile\]/);

    if (profileMatch?.index == null) {
      break;
    }

    const userId =
      profileMatch[1] ??
      (await osu.createOrRefreshUser(profileMatch[2], { byName: true }).catch(() => null))?.id;

    if (userId == null) {
      profileMatchStart += profileMatch.index + profileMatch[0].length;
      continue;
    }

    description =
      description.slice(0, profileMatchStart + profileMatch.index) +
      `[url=https://osu.ppy.sh/users/${userId}]${profileMatch[2]}[/url]` +
      profileMatchInput.slice(profileMatch.index + profileMatch[0].length);
    profileMatchStart += profileMatch.index;
  }

  return description;
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

export function pick<T, K extends keyof T>(object: T, keys: K[]): Pick<T, K> {
  const pickObject: Partial<Pick<T, K>> = {};

  for (const key of keys) {
    pickObject[key] = object[key];
  }

  return pickObject as Pick<T, K>;
}

export function sortCreators(creators: User[], hostId: User['id'] | undefined): User[] {
  return [...creators].sort((a, b) => {
    if (a.id === hostId) {
      return -1;
    }

    if (b.id === hostId) {
      return 1;
    }

    return a.name.localeCompare(b.name);
  });
}
