const db = require('./database').knex;
const extCalls = require('../server/extCalls');
const helpers = require('../server/helpers');
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
  CREATE TABLE IF NOT EXISTS ingredientImages(
    ingredient TEXT NOT NULL PRIMARY KEY,
    imageUrl TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    updatedAt TIMESTAMPTZ DEFAULT NOW()
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
    sourceUrl TEXT,
    isExtension boolean DEFAULT FALSE,
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
  email = email.toLowerCase().trim();
  return db.select('email', 'name', 'password').from('users').where('email', email);
};

// Takes in object with email
const selectIngredients = ({ email, table }) => {
  email = email.toLowerCase().trim();
  const query = `SELECT ${table}.*, ingredientimages.imageurl
      FROM ${table} 
      LEFT OUTER JOIN ingredientimages
      ON ${table}.ingredient = ingredientimages.ingredient
      WHERE email = :email
      ORDER BY ${table}.ingredient`

  return db.raw(query, {email: email}).then((results) => {
    return results.rows;
  });
};

const selectPurchasedGroceryList = ({ email }) => {
  email = email.toLowerCase().trim();
  return db.select('*').from('grocerylist').where({email: email, ispurchased: true}).orderBy('ingredient');
};

// Takes in object with email and recipeId
const selectRecipe = ({ email, recipeId }) => {
  email = email.toLowerCase().trim();
  return db.select('recipeid').from('usersrecipes').where({email: email, recipeid: recipeId});
};

const selectIngredientImage = ({ ingredient }) => {
  return db.select('*').from('ingredientimages').where({ingredient: ingredient});
}
//====================================================
// Takes in object with email, password, and name
const insertUser = ({ email, password, name }) => {
  email = email.toLowerCase().trim();
  return db('users').insert({ email: email, password: password, name: name });
};

const insertIngredientImage = ({ ingredient }) => {
  return extCalls.getImageByString(ingredient).then((results) => {
    return db('ingredientimages').insert({ ingredient: ingredient, imageurl: results });
  })
};

// Takes in object with email and either ingredients array or ingredients object
// Inserts row if ingredient for email exists else updates that row with new quantity and unit
const insertIngredients = ({ email, oldIngredients, ingredients, shouldReplace, table }) => {
  email = email.toLowerCase().trim();
  if (!shouldReplace) {
    try {
      ingredients = helpers.combineIngredientsKeepBoth(ingredients, oldIngredients);
    } catch(err) {
      console.error('ERROR combining in insert');
      throw err;
    }
  }
  let params = [];
  if (Array.isArray(ingredients)) {
    ingredients.forEach(({ ingredient, quantity, unit, ispurchased }) => {
      selectIngredientImage({ingredient: ingredient}).then((results) => {
        if (!results.length) {
          insertIngredientImage({ingredient: ingredient}).then((results) => {
            return results;
          });
        }
      });
      params.push({ email: email, ingredient: ingredient, quantity: quantity, unit: unit, ispurchased: ispurchased });
    });
  } else {
    params.push({ email: email, ingredient: ingredients.ingredient, quantity: ingredients.quantity, unit: ingredients.unit });
  }

  let query = '';
  if (table === 'ingredients') {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit;`;
  } else if (table === 'grocerylist') {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit, ispurchased) 
      VALUES(:email, :ingredient, :quantity, :unit, :ispurchased) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit, ispurchased = :ispurchased;`;
  }

  let promises = [];
  params.forEach((param) => {
    promises.push(db.raw(query, param));
  });
  return promises;
};

const insertIngredientsByKeeping = ({ email, oldIngredients, ingredients, shouldReplace, table }) => {
  email = email.toLowerCase().trim();
  if (!shouldReplace) {
    ingredients = helpers.combineIngredientsKeepBoth(ingredients, oldIngredients);
  }
  let params = [];
  if (Array.isArray(ingredients)) {
    ingredients.forEach(({ ingredient, quantity, unit, ispurchased }) => {
      params.push({ email: email, ingredient: ingredient, quantity: quantity, unit: unit, ispurchased: ispurchased });
    });
  } else {
    params.push({ email: email, ingredient: ingredients.ingredient, quantity: ingredients.quantity, unit: ingredients.unit });
  }
  
  let query = '';
  if (table === 'ingredients') {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit) 
      VALUES(:email, :ingredient, :quantity, :unit) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit;`;
  } else if (table === 'grocerylist') {
    query = `INSERT INTO 
      ${table} (email, ingredient, quantity, unit, ispurchased) 
      VALUES(:email, :ingredient, :quantity, :unit, :ispurchased) 
      ON CONFLICT(email, ingredient) 
      DO UPDATE
      SET quantity = :quantity, unit = :unit, ispurchased = :ispurchased;`;
  }

  let promises = [];
  params.forEach((param) => {
    promises.push(db.raw(query, param));
  });
  return promises;
};

const groceryListIntoIngredients = ({email, groceryIngredients, pantryIngredients}) => {
  email =  email.toLowerCase();
  combinedIngredients = helpers.combineIngredientsKeepBoth(groceryIngredients, pantryIngredients)
  console.log('COMBINE', combinedIngredients);
  // const query = `INSERT INTO ingredients (email, ingredient, quantity, unit)
  //     SELECT email, ingredient, quantity, unit
  //       FROM grocerylist
  //       WHERE email = :email 
  //       AND ispurchased = TRUE
  //     ON CONFLICT(email, ingredient)
  //       DO UPDATE SET quantity = ingredients.quantity + excluded.quantity;`;
  const query = `INSERT INTO ingredients (email, ingredient, quantity, unit)
      SELECT email, ingredient, quantity, unit
        FROM grocerylist
        WHERE email = :email 
        AND ispurchased = TRUE
      ON CONFLICT(email, ingredient)
        DO UPDATE SET quantity = ingredients.quantity + excluded.quantity;`;
  return db.raw(query, {email: email, combinedIngredients: combinedIngredients});
}

const insertRecipe = (recipe) => {
  const query = `INSERT INTO
  recipes (recipeId, title, imageUrl, sourceUrl, isExtension)
  SELECT :id, :title, :image, :sourceUrl, :isExtension
    WHERE NOT EXISTS (
      SELECT recipeId FROM recipes WHERE recipeId = :id
  );`
  return db.raw(query, recipe);
};

const insertUsersRecipe = (recipe) => {
  recipe.email = recipe.email.toLowerCase();
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
  params.email = params.email.toLowerCase().trim();
  const query = `DELETE FROM usersrecipes
    WHERE email = :email AND recipeid = :id`;
  return db.raw(query, params);
}

const deleteIngredients = ({ email, table }) => {
  email = email.toLowerCase().trim();
  const query = `DELETE FROM ${table}
    WHERE email = :email AND quantity <= 0`;
  return db.raw(query, { email });
}

const deleteGroceries = ({ email, table }) => {
  email = email.toLowerCase().trim();
  const query = `DELETE FROM ${table}
    WHERE email = :email AND quantity <= 0`;
  return db.raw(query, { email });
}

const deletePurchasedGroceries = ({ email, table }) => {
  email = email.toLowerCase().trim();
  const query = `DELETE FROM ${table}
    WHERE email = :email AND (quantity <= 0 OR ispurchased = TRUE)`;
  return db.raw(query, { email });
}

const fetchUserRecipes = ({ email }) => {
  email = email.toLowerCase().trim();
  return db.select('*').from('recipes').join('usersrecipes', 'recipes.recipeid', '=', 'usersrecipes.recipeid').where({'email': email, 'isextension': false});
}

const fetchUserExtensionRecipes = ({ email }) => {return db.select('*').from('recipes').join('usersrecipes', 'recipes.recipeid', '=', 'usersrecipes.recipeid').where({'email': email, 'isextension': true});
  email = email.toLowerCase().trim();
}
//====================================================
module.exports = {
  selectUser,
  selectIngredients,
  selectPurchasedGroceryList,
  insertUser,
  insertIngredients,
  insertIngredientsByKeeping,
  saveRecipe,
  deleteRecipe,
  deleteGroceries,
  deletePurchasedGroceries,
  selectRecipe,
  deleteIngredients,
  fetchUserRecipes,
  fetchUserExtensionRecipes,
  groceryListIntoIngredients
};