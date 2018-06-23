require('dotenv').config();

const knex = require('knex')({
  dialect: 'pg',
  connection: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: true
  }
})

module.exports.knex = knex;