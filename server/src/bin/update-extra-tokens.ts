#!/usr/bin/env node

import type { ExtraToken } from 'loved-bridge/tables';
import db from '../db.js';
import { systemLog } from '../log.js';
import { Osu } from '../osu.js';

await db.initialize();

const extraTokens = await db.query<ExtraToken>('SELECT * FROM extra_tokens');

for (const { token, user_id } of extraTokens) {
  // Negative 50-day threshold to refresh tokens only if they have been expired for over a round
  const newToken = await new Osu(token).tryRefreshToken(-4320000000).catch((error) => {
    systemLog(`Error refreshing extra token for user ${user_id}`, SyslogLevel.err);
    systemLog(error, SyslogLevel.err);
  });

  if (newToken != null) {
    await db.query(
      `
        UPDATE extra_tokens
        SET token = ?
        WHERE user_id = ?
      `,
      [JSON.stringify(newToken), user_id],
    );

    systemLog(`Refreshed extra token for user ${user_id}`, SyslogLevel.info);
  }
}

await db.close();
