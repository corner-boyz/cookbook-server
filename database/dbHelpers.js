const db = require('./database').knex;

//Creates tables if they don't exist yet
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
  return new Promise ((resolve, reject) => {
    db.raw(query).then((results) => {
      resolve(results);
    }).catch((err) => {
      reject(err);
    })
  })
};

createTables().then((results) => {
  console.log('SUCCESS connecting to DB');
}).catch((err) => {
  console.error('ERROR connecting to DB:', err);
});

// Takes in object with email
const selectUser = ({email}) => {
  return new Promise((resolve, reject) => {
    db.select('email', 'name', 'password').from('users').where('email', email).then((results) => {
      resolve(results);
    }).catch((err) => {
      reject(err);
    })
  });
};

// Takes in object with email
const selectIngredients = ({email}) => {
  return new Promise((resolve, reject) => {
    db.select('ingredient', 'quantity', 'unit').from('ingredients').where('email', email).then((results) => {
      resolve(results);
    }).catch((err) => {
      reject(err);
    })
  });
};

// Takes in object with email, password, and name
const insertUser = ({email, password, name}) => {
  return new Promise((resolve, reject) => {
    db('users').insert({email: email, password: password, name: name}).then((results) => {
      resolve(results);
    }).catch((err) => {
      reject(err);
    })
  });
};

// Takes in object with email and either ingredients array or ingredients object
// Inserts row if ingredient for email exists else updates that row with new quantity and unit
const insertIngredients = ({email, ingredients, shouldReplace}) => {
  console.log('increment', shouldReplace);
  let params = []
  if (Array.isArray(ingredients)) {
    ingredients.forEach(({ingredient, quantity, unit}) => {
      params.push({email: email, ingredient: ingredient, quantity: quantity, unit: unit});
    })
  } else {
    params.push({email: email, ingredient: ingredients.ingredient, quantity: ingredients.quantity, unit: ingredients.unit});
  }

  let query = '';
  if (shouldReplace) {
    query = `INSERT INTO 
      ingredients (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit`;
  } else {
    query = `INSERT INTO 
      ingredients (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = ingredients.quantity + :quantity, unit = :unit`;
  }
  
  let promises = [];
  params.forEach((param) => {    
    promises.push(new Promise((resolve, reject) => {
      db.raw(query, param).then((results) => {
        resolve(results);
      }).catch((err) => {
        reject(err);
      });
    }));
  });
  return promises;
};

module.exports = {
  selectUser,
  selectIngredients,
  insertUser,
  insertIngredients
};