#!/usr/bin/env node

const { readFile, rename, writeFile } = require('fs').promises;
const { get } = require('https');
const { osuApiKey } = require('./config.json');

/*
Sheet columns:
- Username (rewritten by #ID)
- Permission [Yes/No/Pending/Unreachable]
- Blacklist or whitelist
- Reason for permission, blacklist, or whitelist
*/

(async () => {
  const mapperSheet = await readTsv(`${__dirname}/mapper-sheet.tsv`);
  const cleanRows = [];
  const uncleanRows = [];

  for (const row of mapperSheet) {
    // Attempt to convert usernames to IDs
    if (!tsvValue(row, 0).startsWith('#')) {
      const names =
        tsvValue(row, 0)
          .split('/')
          .map((name) => name.trim());
      let id;

      for (const name of names) {
        const user = await getUser({ type: 'string', u: name });

        if (user == null || (id != null && user.user_id !== id)) {
          id = null;
          break;
        }

        id = user.user_id;
      }

      if (id != null) {
        row[0] = `#${id}`;
      }
    }

    // Separate clean rows
    let clean =
      tsvValue(row, 0).startsWith('#') &&
      ['Yes', 'No', 'Pending', 'Unreachable'].includes(tsvValue(row, 1)) &&
      tsvValue(row, 2).length === 0;

    if (!process.argv.includes('--reasons-are-clean', 2)) {
      clean = clean && tsvValue(row, 3).length === 0;
    }

    (clean ? cleanRows : uncleanRows).push(row);
  }

  const timestamp = pathTimestamp();

  if (cleanRows.length > 0) {
    await writeSql(
      `${__dirname}/${timestamp}.sql`,
      'mapper_consents_import',
      ['id', 'consent', 'consent_reason', 'updated_at', 'updater_id'],
      cleanRows.map((row) => [
        tsvValue(row, 0).slice(1),
        {
          Pending: 'NULL',
          No: '0',
          Yes: '1',
          Unreachable: '2',
        }[tsvValue(row, 1)],
        tsvValue(row, 3).length > 0 ? sqlString(tsvValue(row, 3)) : 'NULL',
        sqlString('1970-01-01 00:00:01'),
        '0',
      ]),
    );
  }

  await rename(
    `${__dirname}/mapper-sheet.tsv`,
    `${__dirname}/mapper-sheet-${timestamp}.tsv`,
  );

  if (uncleanRows.length > 0) {
    await writeTsv(
      `${__dirname}/mapper-sheet.tsv`,
      ['Username', 'Permission', 'Blacklist or whitelist', 'Reason'],
      uncleanRows,
    );
  }
})();

function pathTimestamp() {
  return new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[T:]/g, '-');
}

function tsvValue(row, index) {
  return row[index] == null ? '' : row[index];
}

async function readTsv(path) {
  return (await readFile(path, 'utf8'))
    .trim()
    .split('\n')
    .map((line) => line.split('\t'))
    .slice(1);
}

function writeTsv(path, titles, rows) {
  const titlesTsv = titles.join('\t');
  const rowsTsv = rows
    .map((row) => row.join('\t'))
    .join('\n');
  const tsv = `${titlesTsv}\n${rowsTsv}\n`;

  return writeFile(path, tsv);
}

function sqlString(string) {
  return `'${string.replace(/'/g, "''")}'`;
}

function writeSql(path, table, columnNames, rows) {
  const columnsSql = columnNames.join(', ');
  const valuesSql = rows
    .map((row) => `(${row.join(', ')})`)
    .join(', ');
  const sql = `INSERT INTO ${table} (${columnsSql}) VALUES ${valuesSql};\n`;

  return writeFile(path, sql);
}

async function getUser(params) {
  console.log(`Fetching user ${params.u}`);
  await new Promise((resolve) => setTimeout(resolve, 500));

  let url = `https://osu.ppy.sh/api/get_user?k=${osuApiKey}`;
  Object.keys(params).forEach((k) => url += `&${k}=${params[k]}`);

  return await new Promise((resolve, reject) => {
    const request = get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        const result = JSON.parse(data);

        resolve(result.length > 0 ? result[0] : null);
      });
    });

    request.on('error', (error) => reject(error.message));
  });
}
