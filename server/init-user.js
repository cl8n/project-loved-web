#!/usr/bin/env node

if (process.argv.length !== 3) {
  console.error('Usage: init-user.js <osu! username>');
  process.exit(1);
}

require('dotenv').config();
const db = require('./db');
const { Osu } = require('./osu');

const osu = new Osu();
const username = process.argv[2];

(async () => {
  await Promise.all([db.initialize(), osu.getClientCredentialsToken()]);

  const user = await osu.createOrRefreshUser(username, { byName: true });

  if (user == null) {
    console.error('Invalid username');
    process.exit(1);
  }

  await db.transact(async (connection) => {
    await connection.query('DELETE FROM user_roles WHERE id = ?', user.id);
    await connection.query('INSERT INTO user_roles SET ?', {
      id: user.id,
      dev: true,
      god: true,
    });
  });

  console.log(`Added ${user.name} [#${user.id}] as administrator`);

  await db.close();
})();
