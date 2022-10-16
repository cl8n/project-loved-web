#!/usr/bin/env node

import type { ExtraToken, User } from 'loved-bridge/tables';
import { LogType } from 'loved-bridge/tables';
import db from '../db.js';
import { dbLog, systemLog } from '../log.js';
import { Osu } from '../osu.js';
import { isResponseError } from '../type-guards.js';

await db.initialize();

const extraTokens = await db.query<ExtraToken>('SELECT * FROM extra_tokens');

for (const { token, user_id } of extraTokens) {
  try {
    // Negative 50-day threshold to refresh tokens only if they have been expired for over a round
    const newToken = await new Osu(token).tryRefreshToken(-4320000000);

    if (newToken != null) {
      await db.query(
        `
          UPDATE extra_tokens
          SET token = ?
          WHERE user_id = ?
        `,
        [JSON.stringify(newToken), user_id],
      );
      systemLog(`Refreshed extra token on schedule for user ${user_id}`, SyslogLevel.info);
    }
  } catch (error) {
    if (isResponseError(error) && error.status === 401) {
      const user = await db.queryOne<Pick<User, 'banned' | 'country' | 'id' | 'name'>>(
        `
          SELECT banned, country, id, name
          FROM users
          WHERE id = ?
        `,
        [user_id],
      );

      await db.transact(async (connection) => {
        await connection.query('DELETE FROM extra_tokens WHERE user_id = ?', [user_id]);
        await dbLog(LogType.extraTokenDeleted, { user }, connection);
      });
    } else {
      systemLog(`Error refreshing extra token on schedule for user ${user_id}`, SyslogLevel.err);
      systemLog(error, SyslogLevel.err);
    }
  }
}

await db.close();
