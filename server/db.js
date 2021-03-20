const mysql = require('mysql');
const config = require('./config.json');

class MysqlDatabase {
  constructor(connectionConfig) {
    this.connection = mysql.createConnection(connectionConfig);
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.connection.connect(function (error) {
        if (error)
          return reject(error);

        resolve();
      });
    });
  }

  query(sql, values) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, values, function (error, results) {
        if (error)
          return reject(error);

        resolve(results);
      });
    });
  }

  async queryOne(sql, values) {
    return (await this.query(sql, values))[0];
  }

  async queryWithGroups(sql, values) {
    const selects = sql
      .slice(sql.indexOf('SELECT') + 6, sql.indexOf('FROM'))
      .split(',')
      .map((select) => select.trim());
    const specialSelectRealTables = [];
    const specialSelectInfo = [];
    const normalSelects = [];

    for (const select of selects) {
      const parts = select.split(':');

      if (parts.length === 1)
        normalSelects.push(select);
      else {
        const joinMatch = sql.match(new RegExp(`JOIN\\s+(\\S+)\\s+AS\\s+${parts[0]}`, 'i'));
        const realTable = joinMatch == null ? parts[0] : joinMatch[1];

        specialSelectRealTables.push(realTable);
        specialSelectInfo.push([parts[0], parts[1], realTable]);
      }
    }

    const specialSelectRealColumns = (await this.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name IN (?)
    `, [
      config.dbDatabase,
      specialSelectRealTables,
    ]))
      .reduce((prev, column) => {
        if (prev[column.table_name] == null)
          prev[column.table_name] = [];

        prev[column.table_name].push(column.column_name);
        return prev;
      }, {});

    const specialSelectsSqls = specialSelectInfo.map(
      ([fromTable, toTable, realFromTable]) => specialSelectRealColumns[realFromTable].map(
          (column) => `${fromTable}.${column} AS '${toTable}:${column}'`
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
  database: config.dbDatabase,
  host: config.dbHost,
  password: config.dbPassword,
  port: config.dbPort,
  user: config.dbUser,

  typeCast: function (field, next) {
    if (field.type !== 'TINY' || field.length !== 1)
      return next();

    const string = field.string();

    return string === '0' ? false : string === '1' ? true : null;
  },
});
