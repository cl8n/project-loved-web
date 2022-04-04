#!/usr/bin/env node

import 'dotenv/config';
import type { Beatmapset } from 'loved-bridge/tables';
import db from './db';
import { Osu } from './osu';

if (process.argv.length !== 3) {
  console.error('Usage: update-stale-beatmapsets.js <beatmapset count>');
  process.exit(1);
}

const osu = new Osu();
const beatmapsetCount = parseInt(process.argv[2], 10);

(async () => {
  await Promise.all([db.initialize(), osu.getClientCredentialsToken()]);

  const beatmapsetIds = await db.query<Pick<Beatmapset, 'id'>>(
    `
      SELECT id
      FROM beatmapsets
      WHERE deleted_at IS NULL
      ORDER BY api_fetched_at ASC
      LIMIT ?
    `,
    [beatmapsetCount],
  );

  for (const { id } of beatmapsetIds) {
    const beatmapset = await osu.createOrRefreshBeatmapset(id, true).catch(() => null);

    if (beatmapset == null) {
      console.error(`Could not update beatmapset #${id}`);
    }
  }

  await Promise.all([db.close(), osu.revokeToken()]);
})();
