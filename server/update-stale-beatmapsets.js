#!/usr/bin/env node

if (process.argv.length !== 3) {
  console.error('Usage: update-stale-beatmapsets.js <beatmapset count>');
  process.exit(1);
}

require('dotenv').config();
const db = require('./db');
const { Osu } = require('./osu');

const osu = new Osu();
const beatmapsetCount = parseInt(process.argv[2], 10);

(async () => {
  await Promise.all([db.initialize(), osu.getClientCredentialsToken()]);

  const beatmapsetIds = await db.query(
    `
      SELECT id
      FROM beatmapsets
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

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await db.close();
})();
