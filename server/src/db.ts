import type { Pool, PoolConnection, PoolOptions } from 'mysql2/promise';
import { createPool } from 'mysql2/promise';
import config from './config.js';

type Field = Date | boolean | number | string | null;
type Row = Record<string, Field>;
type RowWithGroups = Record<string, Field | Row>;
type StatementInsert = `${string}INSERT INTO${string}` | `${string}INSERT IGNORE INTO${string}`;
type StatementSelect = `${string}SELECT${string}FROM${string}`;
type StatementUpdate = `${string}UPDATE${string}`;

export type MysqlConnectionType = MysqlConnection;

class MysqlConnection {
  #columnsByTable: Record<string, string[]> | undefined;
  #connection: PoolConnection;

  constructor(connection: PoolConnection, columnsByTable: Record<string, string[]> | undefined) {
    this.#columnsByTable = columnsByTable;
    this.#connection = connection;
  }

  query(sql: StatementInsert, values?: unknown[]): Promise<{ insertId: number }>;
  query<T = Row>(sql: StatementSelect, values?: unknown[]): Promise<T[]>;
  query(sql: StatementUpdate, values?: unknown[]): Promise<{ changedRows: number }>;
  query(sql: string, values?: unknown[]): Promise<void>;
  query(
    sql: string,
    values?: unknown[],
  ): Promise<unknown[] | { changedRows: number } | { insertId: number } | void> {
    return this.#connection.query(sql, values).then((result) => result[0]);
  }

  async queryOne<T = Row>(sql: StatementSelect, values?: unknown[]): Promise<T | null> {
    return (await this.query<T>(sql, values))[0] ?? null;
  }

  async queryWithGroups<T = RowWithGroups>(sql: StatementSelect, values?: unknown[]): Promise<T[]> {
    if (this.#columnsByTable == null) {
      throw 'Columns not loaded yet';
    }

    const selects = sql
      .slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM'))
      .split(',')
      .map((select) => select.trim());
    const specialSelectInfo: [string, string, string][] = [];
    const normalSelects: string[] = [];

    for (const select of selects) {
      const parts = select.split(':');

      if (parts.length === 1 || select.match(/\s+AS\s+/i) != null) {
        normalSelects.push(select);
      } else {
        const joinMatch = sql.match(new RegExp(`JOIN\\s+(\\S+)\\s+AS\\s+${parts[0]}`, 'i'));

        specialSelectInfo.push([parts[0], parts[1], joinMatch == null ? parts[0] : joinMatch[1]]);
      }
    }

    const specialSelectsSqls = specialSelectInfo.map(([fromTable, toTable, realFromTable]) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.#columnsByTable![realFromTable].map(
        (column) => `\`${fromTable}\`.\`${column}\` AS '${toTable}:${column}'`,
      ),
    );

    sql = (sql.slice(0, sql.indexOf('SELECT') + 6) +
      ' ' +
      normalSelects.concat(...specialSelectsSqls).join(', ') +
      ' ' +
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sql.slice(sql.indexOf('FROM'))) as any;

    // TODO typing this is a nightmare
    return (await this.query(sql, values)).map(function (row) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const grouped: any = {};
      const groups: string[] = [];

      Object.entries(row).forEach(function ([column, value]) {
        const parts = column.split(':');

        if (parts.length === 1) {
          grouped[column] = value;
        } else {
          if (grouped[parts[0]] == null) {
            grouped[parts[0]] = { _allNull: true };
            groups.push(parts[0]);
          }

          if (grouped[parts[0]]._allNull && value != null) {
            grouped[parts[0]]._allNull = false;
          }

          grouped[parts[0]][parts[1]] = value;
        }
      });

      for (const group of groups) {
        if (grouped[group]._allNull) {
          grouped[group] = null;
        } else {
          delete grouped[group]._allNull;
        }
      }

      return grouped;
    });
  }

  async queryOneWithGroups<T = RowWithGroups>(
    sql: StatementSelect,
    values?: unknown[],
  ): Promise<T | null> {
    if (this.#columnsByTable == null) {
      throw 'Columns not loaded yet';
    }

    return (await this.queryWithGroups<T>(sql, values))[0] ?? null;
  }

  async transact<T>(fn: (connection: this) => Promise<T>): Promise<T> {
    await this.query('START TRANSACTION');

    try {
      const result = await fn(this);
      await this.query('COMMIT');
      return result;
    } catch (error) {
      await this.query('ROLLBACK');
      throw error;
    }
  }
}

class MysqlPool {
  #closed = false;
  #columnsByTable?: Record<string, string[]>;
  #pool: Pool;

  constructor(config: PoolOptions) {
    this.#pool = createPool(config);
  }

  get pool(): Pool {
    return this.#pool;
  }

  async close(): Promise<void> {
    if (this.#closed) {
      return;
    }

    await this.#pool.end();

    this.#closed = true;
  }

  async initialize(): Promise<void> {
    this.#columnsByTable = (
      await this.query<{ COLUMN_NAME: string; TABLE_NAME: string }>(
        `
          SELECT TABLE_NAME, COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
        `,
        [config.dbDatabase],
      )
    ).reduce<Record<string, string[]>>((prev, column) => {
      if (prev[column.TABLE_NAME] == null) {
        prev[column.TABLE_NAME] = [];
      }

      prev[column.TABLE_NAME].push(column.COLUMN_NAME);
      return prev;
    }, {});
  }

  // Typing doesn't seem to work with overloads here
  readonly query: MysqlConnection['query'] = (...args: unknown[]) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.useConnection((connection: any) => connection.query(...args)) as any;

  readonly queryOne: MysqlConnection['queryOne'] = (...args) =>
    this.useConnection((connection) => connection.queryOne(...args));

  readonly queryWithGroups: MysqlConnection['queryWithGroups'] = (...args) => {
    if (this.#columnsByTable == null) {
      return Promise.reject('Columns not loaded yet');
    }

    return this.useConnection((connection) => connection.queryWithGroups(...args));
  };

  readonly queryOneWithGroups: MysqlConnection['queryOneWithGroups'] = (...args) => {
    if (this.#columnsByTable == null) {
      return Promise.reject('Columns not loaded yet');
    }

    return this.useConnection((connection) => connection.queryOneWithGroups(...args));
  };

  readonly transact: MysqlConnection['transact'] = (...args) =>
    this.useConnection((connection) => connection.transact(...args));

  async useConnection<T>(fn: (connection: MysqlConnection) => Promise<T>): Promise<T> {
    if (this.#closed) {
      throw 'Connection pool has been closed';
    }

    const connection = await this.#pool.getConnection();

    try {
      return await fn(new MysqlConnection(connection, this.#columnsByTable));
    } finally {
      connection.release();
    }
  }
}

const db = new MysqlPool({
  database: config.dbDatabase,
  host: config.dbHost,
  password: config.dbPassword,
  port: config.dbPort,
  user: config.dbUser,

  charset: 'utf8mb4_general_ci',
  decimalNumbers: true,

  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      const string = field.string();
      return string === '0' ? false : string === '1' ? true : null;
    }

    if (
      field.type === 'BLOB' &&
      ((field.table === 'extra_tokens' && field.name === 'token') ||
        (field.table === 'logs' && field.name === 'values'))
    ) {
      const string = field.string();
      return string == null ? null : JSON.parse(string);
    }

    return next();
  },
});
export default db;
