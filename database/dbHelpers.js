const db = require('./database').knex;
//====================================================
//Creates tables if they don't exist yet
const createTables = () => {
  const query = `CREATE TABLE IF NOT EXISTS users(
    email TEXT NOT NULL PRIMARY KEY,
    password TEXT,
    name TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS pantries(
    pantryId SERIAL PRIMARY KEY,
    name TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS usersPantries(
    email TEXT NOT NULL REFERENCES users(email),
    pantryId INT NOT NULL REFERENCES pantries(pantryId),
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(email, pantryId)
  );
  CREATE TABLE IF NOT EXISTS ingredients(
    ingredient TEXT NOT NULL,
    email TEXT NOT NULL REFERENCES users(email),
    pantryId INT REFERENCES pantries(pantryId),
    quantity INT,
    unit TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(ingredient, email)
  );
  CREATE TABLE IF NOT EXISTS groceryList(
    ingredient TEXT NOT NULL,
    email TEXT NOT NULL REFERENCES users(email),
    quantity REAL,
    unit TEXT,
    isPurchased boolean DEFAULT FALSE,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(ingredient, email)
  );
  CREATE TABLE IF NOT EXISTS recipes(
    recipeId TEXT NOT NULL PRIMARY KEY,
    title TEXT,
    imageUrl TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW());
  CREATE TABLE IF NOT EXISTS usersRecipes(
    email TEXT NOT NULL REFERENCES users(email),
    recipeId TEXT NOT NULL REFERENCES recipes(recipeId),
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(email, recipeId));`
  return db.raw(query);
};

createTables().then((results) => {
  console.log('SUCCESS connecting to DB');
}).catch((err) => {
  console.error('ERROR connecting to DB:', err);
});
//====================================================
// Takes in object with email
const selectUser = ({ email }) => {
  return db.select('email', 'name', 'password').from('users').where('email', email);
};

// Takes in object with email
const selectIngredients = ({ email, table }) => {
  return db.select('*').from(table).where('email', email).orderBy('ingredient');
};

// Takes in object with email and recipeId
const selectRecipe = ({ email, recipeId }) => {
  return db.select('recipeid').from('usersrecipes').where('recipeid', recipeId);
};
//====================================================
// Takes in object with email, password, and name
const insertUser = ({ email, password, name }) => {
  return db('users').insert({ email: email, password: password, name: name });
};

// Takes in object with email and either ingredients array or ingredients object
// Inserts row if ingredient for email exists else updates that row with new quantity and unit
const insertIngredients = ({ email, ingredients, shouldReplace, table }) => {
  let params = []
  if (Array.isArray(ingredients)) {
    ingredients.forEach(({ ingredient, quantity, unit }) => {
      params.push({ email: email, ingredient: ingredient, quantity: quantity, unit: unit });
    })
  } else {
    params.push({ email: email, ingredient: ingredients.ingredient, quantity: ingredients.quantity, unit: ingredients.unit });
  }

  let query = '';
  if (shouldReplace) {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit`;
  } else {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = ingredients.quantity + :quantity, unit = :unit`;
  }

  let promises = [];
  params.forEach((param) => {
    promises.push(db.raw(query, param));
  });
  return promises;
};

const insertRecipe = (recipe) => {
  const query = `INSERT INTO
  recipes (recipeId, title, imageUrl)
  SELECT :id, :title, :image
    WHERE NOT EXISTS (
      SELECT recipeId FROM recipes WHERE recipeId = :id
  );`
  return db.raw(query, recipe);
};

const insertUsersRecipe = (recipe) => {
  const query = `INSERT INTO 
      usersRecipes (email, recipeId) 
      SELECT :email, :id
        WHERE NOT EXISTS (
          SELECT * FROM usersRecipes WHERE email = :email AND recipeId = :id
        );`;

  return db.raw(query, recipe);
};

const saveRecipe = (recipe) => {
  return new Promise((resolve, reject) => {
    insertRecipe(recipe).then((results) => {
      // console.log('SUCCESS inserting into recipes', recipe);
      insertUsersRecipe(recipe).then((results) => {
        console.log('SUCCESS inserting into usersRecipes');
        resolve(results);
      }).catch((err) => {
        console.error('ERROR inserting into usersRecipes');
        reject(err);
      })
    }).catch((err) => {
      console.error('ERROR inserting into recipes', err);
      reject(err);
    });
  });
}
//====================================================
const deleteRecipe = (params) => {
  const query = `DELETE FROM usersrecipes
    WHERE email = :email AND recipeid = :id`;
  return db.raw(query, params);
}

const deleteIngredients = ({ email, table }) => {
  const query = `DELETE FROM ${table}
    WHERE email = :email AND quantity = 0`;
  return db.raw(query, { email });
}

const fetchUserRecipes = ({ email }) => {
  // console.log('DB: ', email);
  return db.select('*').from('recipes').join('usersrecipes', 'recipes.recipeid', '=', 'usersrecipes.recipeid').where('email', email)
}
//====================================================
module.exports = {
  selectUser,
  selectIngredients,
  insertUser,
  insertIngredients,
  saveRecipe,
  deleteRecipe,
  selectRecipe,
  deleteIngredients,
  fetchUserRecipes,
};