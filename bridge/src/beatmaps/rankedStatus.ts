import type { Beatmapset } from '../tables';

export const enum RankedStatus {
  graveyard = -2,
  workInProgress = -1,
  pending = 0,
  ranked = 1,
  approved = 2,
  qualified = 3,
  loved = 4,
}

export function hasLeaderboard(beatmapset: Beatmapset): boolean {
  return beatmapset.ranked_status > 0;
}
