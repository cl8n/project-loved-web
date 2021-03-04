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

  async queryWithGroups(sql, values, groups) {
    return (await this.query(sql, values)).map(function (row) {
      const grouped = {};

      groups.forEach(function (group) {
        if (group.length)
          grouped[group] = {};
      });

      let currentGroup = 0;

      Object.entries(row).forEach(function ([column, value]) {
        if (column.startsWith(':'))
          return currentGroup++;

        const group = groups[currentGroup];

        (group.length ? grouped[group] : grouped)[column] = value;
      });
    });
  }

  async queryOneWithGroups(sql, values, groups) {
    return (await this.queryWithGroups(sql, values, groups))[0];
  }
}

module.exports = new MysqlDatabase({
  database: config.dbDatabase,
  host: config.dbHost,
  password: config.dbPassword,
  port: config.dbPort,
  user: config.dbUser,

  typeCast: function (field, next) {
    return field.type === 'TINY' && field.length === 1
      ? field.string() !== '0'
      : next();
  },
});
