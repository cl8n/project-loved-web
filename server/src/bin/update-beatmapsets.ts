#!/usr/bin/env node

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
  await osu.createOrRefreshBeatmapset(id, true).catch((error) => {
    systemLog(`Error refreshing beatmapset ${id}`, SyslogLevel.err);
    systemLog(error, SyslogLevel.err);
  });
}

await Promise.all([db.close(), osu.revokeToken()]);
