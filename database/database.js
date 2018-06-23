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

const createTables = () => {
  const query = `CREATE TABLE IF NOT EXISTS users(
    email TEXT NOT NULL PRIMARY KEY,
    password TEXT,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS pantries(
    pantryId SERIAL PRIMARY KEY,
    name TEXT
  );
  CREATE TABLE IF NOT EXISTS usersPantries(
    email TEXT NOT NULL REFERENCES users(email),
    pantryId INT NOT NULL REFERENCES pantries(pantryId),
    PRIMARY KEY(email, pantryId)
  );
  CREATE TABLE IF NOT EXISTS ingredients(
    ingredient TEXT NOT NULL,
    email TEXT NOT NULL REFERENCES users(email),
    pantryId INT REFERENCES pantries(pantryId),
    quantity INT,
    unit TEXT,
    PRIMARY KEY(ingredient, email)
  );`
  knex.raw(query).then((results) => {
    console.log('SUCCESS connecting to DB');
  }).catch((err) => {
    console.error('ERROR connecting to DB:', err);
  })
};
createTables();

// Takes in object with email
const selectUser = ({email}) => {
  knex.select('email', 'name').from('users').where('email', email).then((results) => {
    console.log('SUCCESS selecting user:', results);
  }).catch((err) => {
    console.error('ERROR selecting user:', err);
  })
};

// Takes in object with email
const selectIngredients = ({email}) => {
  knex.select('ingredient', 'quantity', 'unit').from('ingredients').where('email', email).then((results) => {
    console.log('SUCCESS selecting ingredients:', results);
  }).catch((err) => {
    console.error('ERROR selecting ingredients:', err);
  })
};

// Takes in object with email, password, and name
const insertUser = ({email, password, name}) => {
  if (password.length < 6) {
    return console.error('Password must be at least 6 characters');
  }
  knex('users').insert({email: email, password: password, name: name}).then((results) => {
    console.log('SUCCESS inserting user:', results);
  }).catch((err) => {
    console.error('ERROR inserting user:', err);
  })
};

// Takes in object with email and either ingredients array or ingredients object
// Inserts row if ingredient for email exists else updates that row with new quantity and unit
const insertIngredients = ({email, ingredients}) => {
  let params = []
  if (Array.isArray(ingredients)) {
    ingredients.forEach(({ingredient, quantity, unit}) => {
      params.push({email: email, ingredient: ingredient, quantity: quantity, unit: unit});
    })
  } else {
    params.push({email: email, ingredient: ingredients.ingredient, quantity: ingredients.quantity, unit: ingredients.unit});
  }

  params.forEach((param) => {
    const query = `INSERT INTO 
    ingredients (email, ingredient, quantity, unit) 
    VALUES(:email, :ingredient, :quantity, :unit) 
    ON CONFLICT(email, ingredient) 
    DO UPDATE
    SET quantity = :quantity, unit = :unit`;
    knex.raw(query, param).then((results) => {
      console.log('SUCCESS inserting/updating ingredient:', results);
    }).catch((err) => {
      console.error('ERROR inserting/updating ingredient:', err);
    })
  })
}
// insertIngredients({email: 'pizza@pizza.com', ingredients: [{ingredient: 'apple', quantity: 12, unit: 'count'}, {ingredient: 'chicken breast', quantity: 32, unit: 'lb'}, {ingredient: 'blueberry', quantity: 55, unit: 'count'}]});
// insertIngredients({email: 'a@a.com', ingredients: {ingredient: 'brocolli', quantity: 3, unit: 'count'}});
// selectUser({email: 'pizza@pizza.com'});
// selectIngredients({email: 'pizza@pizza.com'});
// insertUser({email: 'a@a.com', password: 'a', name: 'a'});
module.exports.db = knex;