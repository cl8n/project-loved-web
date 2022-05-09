#!/usr/bin/env node

import { Role } from 'loved-bridge/tables';
import db from './db';
import { Osu } from './osu';

if (process.argv.length !== 3) {
  console.error('Usage: init-user.js <osu! username>');
  process.exit(1);
}

const osu = new Osu();
const username = process.argv[2];

(async () => {
  await Promise.all([db.initialize(), osu.getClientCredentialsToken()]);

  const user = await osu.createOrRefreshUser(username, { byName: true });

  if (user == null) {
    console.error('Invalid username');
    process.exit(1);
  }

  await db.query('INSERT IGNORE INTO user_roles SET ?', [
    {
      role_id: Role.admin,
      user_id: user.id,
    },
  ]);

  console.log(`Added ${user.name} [#${user.id}] as administrator`);

  await Promise.all([db.close(), osu.revokeToken()]);
})();
