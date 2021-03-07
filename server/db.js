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
    return (await this.query(sql, values)).map(function (row) {
      const grouped = {};
      let currentGroup = '';

      Object.entries(row).forEach(function ([column, value]) {
        if (!column.startsWith(':'))
          (currentGroup.length > 0 ? grouped[currentGroup] : grouped)[column] = value;
        else {
          currentGroup = column.slice(1);

          if (currentGroup.length > 0)
            grouped[currentGroup] = {};
        }
      });

      return grouped;
    });
  }

  async queryOneWithGroups(sql, values) {
    return (await this.queryWithGroups(sql, values))[0];
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
