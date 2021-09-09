const mysql = require('mysql');

class MysqlConnection {
  #columnsByTable;
  #connection;

  constructor(connection, columnsByTable) {
    this.#columnsByTable = columnsByTable;
    this.#connection = connection;
  }

  query(sql, values) {
    return new Promise((resolve, reject) => {
      this.#connection.query(sql, values, function (error, results) {
        if (error) {
          return reject(error);
        }

        resolve(results);
      });
    });
  }

  async queryOne(sql, values) {
    return (await this.query(sql, values))[0] ?? null;
  }

  async queryWithGroups(sql, values) {
    if (this.#columnsByTable == null) {
      throw 'Columns not loaded yet';
    }

    const selects = sql
      .slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM'))
      .split(',')
      .map((select) => select.trim());
    const specialSelectInfo = [];
    const normalSelects = [];

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
      this.#columnsByTable[realFromTable].map(
        (column) => `\`${fromTable}\`.\`${column}\` AS '${toTable}:${column}'`,
      ),
    );

    sql =
      sql.slice(0, sql.indexOf('SELECT') + 6) +
      ' ' +
      normalSelects.concat(specialSelectsSqls).join(', ') +
      ' ' +
      sql.slice(sql.indexOf('FROM'));

    return (await this.query(sql, values)).map(function (row) {
      const grouped = {};
      const groups = [];

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

  async queryOneWithGroups(sql, values) {
    if (this.#columnsByTable == null) {
      throw 'Columns not loaded yet';
    }

    return (await this.queryWithGroups(sql, values))[0] ?? null;
  }

  async transact(fn) {
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
  #columnsByTable;
  #pool;

  constructor(config) {
    this.#pool = mysql.createPool(config);
  }

  get pool() {
    return this.#pool;
  }

  close() {
    if (this.#closed) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.#pool.end((error) => {
        if (error) {
          return reject(error);
        }

        this.#closed = true;

        resolve();
      });
    });
  }

  async initialize() {
    this.#columnsByTable = (
      await this.query(
        `
          SELECT TABLE_NAME, COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
        `,
        process.env.DB_DATABASE,
      )
    ).reduce((prev, column) => {
      if (prev[column.TABLE_NAME] == null) {
        prev[column.TABLE_NAME] = [];
      }

      prev[column.TABLE_NAME].push(column.COLUMN_NAME);
      return prev;
    }, {});
  }

  query(...args) {
    return this.useConnection((connection) => connection.query(...args));
  }

  queryOne(...args) {
    return this.useConnection((connection) => connection.queryOne(...args));
  }

  queryWithGroups(...args) {
    if (this.#columnsByTable == null) {
      return Promise.reject('Columns not loaded yet');
    }

    return this.useConnection((connection) => connection.queryWithGroups(...args));
  }

  queryOneWithGroups(...args) {
    if (this.#columnsByTable == null) {
      return Promise.reject('Columns not loaded yet');
    }

    return this.useConnection((connection) => connection.queryOneWithGroups(...args));
  }

  transact(...args) {
    return this.useConnection((connection) => connection.transact(...args));
  }

  useConnection(fn) {
    if (this.#closed) {
      return Promise.reject('Connection pool has been closed');
    }

    return new Promise((resolve, reject) => {
      this.#pool.getConnection((error, connection) => {
        if (error) {
          return reject(error);
        }

        fn(new MysqlConnection(connection, this.#columnsByTable))
          .then(resolve, reject)
          .finally(() => connection.release());
      });
    });
  }
}

module.exports = new MysqlPool({
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,

  typeCast: function (field, next) {
    if (field.type !== 'TINY' || field.length !== 1) {
      return next();
    }

    const string = field.string();

    return string === '0' ? false : string === '1' ? true : null;
  },
});
