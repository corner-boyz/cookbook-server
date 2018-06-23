const db = require('./database');

// console.dir(db)
const selectUsers = () => {
  // const query = `SELECT * FROM USERS`
  // db.knex.raw(query).then((results) => {
  //   console.log('SUCCESS connecting to DB:', results);
  // }).catch((err) => {
  //   console.error('ERROR connecting to DB:', err);
  // })
};

module.exports = {selectUsers};