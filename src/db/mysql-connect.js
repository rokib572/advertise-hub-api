const mysql = require('mysql')

const mySqlConnection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database: 'advertising_hub'
  });

  module.exports = mySqlConnection