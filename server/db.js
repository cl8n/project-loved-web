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
}

module.exports = new MysqlDatabase({
  database: config.dbDatabase,
  host: config.dbHost,
  password: config.dbPassword,
  port: config.dbPort,
  user: config.dbUser,
});
