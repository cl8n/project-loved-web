#!/usr/bin/env node

import { RankedStatus } from 'loved-bridge/beatmaps/rankedStatus';
import type { Beatmapset } from 'loved-bridge/tables';
import db from '../db.js';
import { systemLog } from '../log.js';
import { Osu } from '../osu.js';

if (process.argv.length !== 3) {
  console.error('Usage: update-beatmapsets.js <beatmapset count>');
  process.exit(1);
}

const osu = new Osu();
const beatmapsetCount = parseInt(process.argv[2], 10);

await Promise.all([db.initialize(), osu.getClientCredentialsToken()]);

async function updateBeatmapsets(beatmapsets: Pick<Beatmapset, 'id'>[]): Promise<void> {
  for (const id of new Set(beatmapsets.map(({ id }) => id))) {
    await osu.createOrRefreshBeatmapset(id, true).catch((error) => {
      systemLog(`Error refreshing beatmapset ${id}`, SyslogLevel.err);
      systemLog(error, SyslogLevel.err);
    });
  }
}

// Update all beatmapsets in open rounds that aren't already Loved
await updateBeatmapsets(
  await db.query<Pick<Beatmapset, 'id'>>(
    `
      SELECT beatmapsets.id
      FROM beatmapsets
      INNER JOIN nominations
        ON beatmapsets.id = nominations.beatmapset_id
      INNER JOIN rounds
        ON nominations.round_id = rounds.id
      WHERE beatmapsets.api_fetched_at < ?
        AND beatmapsets.deleted_at IS NULL
        AND beatmapsets.ranked_status <> ?
        AND rounds.done = 0
    `,
    [new Date(Date.now() - 40 * 60 * 1000), RankedStatus.loved],
  ),
);

// Update the {beatmapsetCount} most outdated beatmapsets
await updateBeatmapsets(
  await db.query<Pick<Beatmapset, 'id'>>(
    `
      SELECT id
      FROM beatmapsets
      WHERE deleted_at IS NULL
      ORDER BY api_fetched_at ASC
      LIMIT ?
    `,
    [beatmapsetCount],
  ),
);

await Promise.all([db.close(), osu.revokeToken()]);
