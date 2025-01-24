require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DB_FILE || './database.sqlite',
    },
    useNullAsDefault: true,
    debug: false,
    migrations: {
      directory: './migrations',
    },
  },
};
