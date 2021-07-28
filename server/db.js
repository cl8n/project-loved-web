const mysql = require('mysql');

class MysqlDatabase {
  constructor(connectionConfig) {
    this.connected = false;
    this.connection = mysql.createConnection(connectionConfig);
  }

  close() {
    if (!this.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.connection.end((error) => {
        if (error)
          return reject(error);

        resolve();
      });
    });
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection.connect(async (error) => {
        if (error)
          return reject(error);

        this.connected = true;

        const columns = await this.query(`
          SELECT TABLE_NAME, COLUMN_NAME
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ?
        `, process.env.DB_DATABASE);
        this.columnsByTable = columns.reduce((prev, column) => {
          if (prev[column.TABLE_NAME] == null)
            prev[column.TABLE_NAME] = [];

          prev[column.TABLE_NAME].push(column.COLUMN_NAME);
          return prev;
        }, {});

        resolve();
      });
    });
  }

  query(sql, values) {
    if (!this.connected) {
      return Promise.reject('Not connected');
    }

    return new Promise((resolve, reject) => {
      this.connection.query(sql, values, function (error, results) {
        if (error)
          return reject(error);

        resolve(results);
      });
    });
  }

  async queryOne(sql, values) {
    const result = await this.query(sql, values);

    return result[0] == null ? null : result[0];
  }

  async queryWithGroups(sql, values) {
    const selects = sql
      .slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM'))
      .split(',')
      .map((select) => select.trim());
    const specialSelectInfo = [];
    const normalSelects = [];

    for (const select of selects) {
      const parts = select.split(':');

      if (parts.length === 1 || select.match(/\s+AS\s+/i) != null)
        normalSelects.push(select);
      else {
        const joinMatch = sql.match(new RegExp(`JOIN\\s+(\\S+)\\s+AS\\s+${parts[0]}`, 'i'));

        specialSelectInfo.push([
          parts[0],
          parts[1],
          joinMatch == null ? parts[0] : joinMatch[1],
        ]);
      }
    }

    const specialSelectsSqls = specialSelectInfo.map(
      ([fromTable, toTable, realFromTable]) => this.columnsByTable[realFromTable].map(
        (column) => `\`${fromTable}\`.\`${column}\` AS '${toTable}:${column}'`
      )
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

        if (parts.length === 1)
          grouped[column] = value;
        else {
          if (grouped[parts[0]] == null) {
            grouped[parts[0]] = { _allNull: true };
            groups.push(parts[0]);
          }

          if (grouped[parts[0]]._allNull && value != null)
            grouped[parts[0]]._allNull = false;

          grouped[parts[0]][parts[1]] = value;
        }
      });

      for (const group of groups)
        if (grouped[group]._allNull)
          grouped[group] = null;
        else
          delete grouped[group]._allNull;

      return grouped;
    });
  }

  async queryOneWithGroups(sql, values) {
    return (await this.queryWithGroups(sql, values))[0];
  }

  pageQuery(request) {
    const params = { ...request.query, ...request.body };
    let limit, offset;

    if (params.limit != null) {
      limit = params.limit;
      offset = 0;
    } else if (params.page != null) {
      const perPage = params.perPage;

      limit = perPage;
      offset = (page - 1) * perPage;
    } else {
      return '';
    }

    return `LIMIT ${limit} OFFSET ${offset}`;
  }
}

module.exports = new MysqlDatabase({
  database: process.env.DB_DATABASE,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,

  typeCast: function (field, next) {
    if (field.type !== 'TINY' || field.length !== 1)
      return next();

    const string = field.string();

    return string === '0' ? false : string === '1' ? true : null;
  },
});
