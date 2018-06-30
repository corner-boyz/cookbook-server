const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const dbHelpers = require('../database/dbHelpers');
const extCalls = require('./extCalls');

const app = express();

const { parse, combine } = require('recipe-ingredient-parser');
const convert = require('convert-units');
const pluralize = require('pluralize');

const bcrypt = require('bcrypt');

//====================================================
app.use(bodyParser.json());
app.use(morgan('dev'));

// This is necessary to receive requests from the Chrome extension
const allowCrossDomain = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
};
app.use(allowCrossDomain);

  //Get Requests====================================================
app.get('/api/ingredients/:email', (req, res) => {
  const {email} = req.params;
  const table = 'ingredients';
  dbHelpers.selectIngredients({email: email, table: table}).then((results) => {
    console.log('SUCCESS getting ingredients from DB');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR getting ingredients from DB', err);
    res.status(404).end();
  })
});

app.get('/api/grocerylist/:email', (req, res) => {
  const {email} = req.params;
  const table = 'grocerylist';
  dbHelpers.selectIngredients({email: email, table: table}).then((results) => {
    console.log('SUCCESS getting ingredients from DB');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR getting ingredients from DB', err);
    res.status(404).end();
  })
});

app.get('/api/recipe/:recipeId', (req, res) => {
  // const {recipeId} = req.params;
  // extCalls.getRecipeById(recipeId).then((results) => {
  //   console.log('SUCCESS getting recipe from Spoonacular');
  //   res.send(results);
  // }).catch((err) => {
  //   console.error('ERROR getting recipe from Spoonacular', err);
  //   res.status(404).end();
  // });

  // Uncomment if wanting to use test data
  const testRecipe = require('./testRecipe.json');
  res.send(testRecipe);
});

app.get('/api/saverecipe/:recipeId/:email', (req, res) => {
  const {recipeId, email} = req.params;
  console.log('ID', recipeId, 'EMAIL', email)
  dbHelpers.selectRecipe({email: email, recipeId: recipeId}).then((results) => {
    console.log('SUCCESS selecting recipe', results);
    res.send(results);
  }).catch((err) => {
    console.log('ERROR selecting recipe', err);
  });
});

  //Post Requests====================================================
app.post('/api/ingredients', (req, res) => {
  const { email, ingredients, shouldReplace } = req.body;
  const table = 'ingredients';
  ingredients.forEach(object => {
    object.ingredient = pluralize.singular(object.ingredient);
  });
  Promise.all(dbHelpers.insertIngredients({email: email, ingredients: ingredients, shouldReplace: shouldReplace, table: table}))
    .then((results) => {
      console.log('SUCCESS inserting ingredients', results);
      res.send(results);
    }).catch((err) => {
      console.error('ERROR inserting ingredients', err);
      res.status(404).end();
  });
});

app.post('/api/grocerylist', (req, res) => {
  const { email, ingredients, shouldReplace } = req.body;
  const table = 'grocerylist';
  ingredients.forEach(object => {
    object.ingredient = pluralize.singular(object.ingredient);
  });
  Promise.all(dbHelpers.insertIngredients({email: email, ingredients: ingredients, shouldReplace: shouldReplace, table: table}))
    .then((results) => {
      console.log('SUCCESS inserting ingredients', results);
      res.send(results);
    }).catch((err) => {
      console.error('ERROR inserting ingredients', err);
      res.status(404).end();
  });
});

app.post('/api/combine', (req, res) => {
  const { ingredients, oldIngredients } = req.body;
  res.send(combineIngredients(ingredients, oldIngredients));
});

app.post('/api/parse', (req, res) => {
  const { ingredients } = req.body;
  res.send(parseIngredients(ingredients));
});

app.post('/api/saverecipe', (req, res) => {
  const { email, recipe } = req.body;
  const { id, title, image } = recipe;
  dbHelpers.saveRecipe({email: email, id: id, title: title, image: image})
  .then((results) => {
    console.log('SUCCESS saving recipe');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR saving recipe', err);
    res.status(404).end();
  });
});

app.post('/api/recipelist', (req, res) => {
  // extCalls.getRecipesByIngredients(req.body).then((results) => {
  //   console.log('SUCCESS getting recipeList from Spoonacular');
  //   res.send(results);
  // }).catch((err) => {
  //   console.log('ERROR getting recipeList from Spoonacular', err);
  //   res.status(404).end();
  // });
  const testRecipes = require('./testRecipes.json');
  res.send(testRecipes);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  dbHelpers.selectUser({email: email}).then(results => {
    if (!results.length) {
      res.end('Wrong email or password');
    } else {
      let user = results[0];
      bcrypt.compare(password, user.password).then(doesMatch => {
        if (doesMatch) {
          res.send({ email: user.email, name: user.name});
        } else {
          res.end('Wrong email or password');
        }
      });
    }
  }).catch((err) => {
    console.log('Error in retrieving user information from the database', err);
    res.status(404).end();
  });
});

app.post('/api/signup', (req, res) => {
  const { email, password, name } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.log('Error in hashing user password', err);
      res.status(404).end();
    }
    dbHelpers.insertUser({email: email, password: hash, name: name}).then(() =>{
      res.end('User saved!');
    }).catch((err) => {
      console.log('Error in saving new user to the database', err);
      res.status(404).end();
    })
  });
});

//Helper Functions====================================================
const units = {
  teaspoon: 'tsp',
  tablespoon: 'Tbs',
  'fluid ounce': 'fl-oz',
  cup: 'cup',
  pint: 'pnt',
  quart: 'qt',
  gallon: 'gal',
  ounce: 'oz',
  pound: 'lb',
  liter: 'l',
};

const unitsList = ['tsp', 'Tbs', 'fl-oz', 'cup', 'pnt', 'qt', 'gal', 'oz', 'lb', 'l'];

// Takes in array of strings
const parseIngredients = (ingredients) => {
  let parsed = ingredients.map(ingredient => {
    // Create object using 'recipe ingredient parser' module
    let obj = parse(ingredient.toLowerCase());
    // Convert to singular
    obj.ingredient = pluralize.singular(obj.ingredient);
    if (obj.unit) {
      obj.unit = pluralize.singular(obj.unit);
      // Convert to abbreviation
      if (units[obj.unit]) {
        obj.unit = units[obj.unit];
      }
    }
    return obj;
  });
  return parsed;
}

// Takes in two arrays of objects with quantity, unit, and ingredient properties
const combineIngredients = (ingredients, oldIngredients) => {
  // Converts the old ingredients array into an object
  let ingredientsObj = {};
  oldIngredients.forEach(ingredient => {
    ingredientsObj[ingredient.ingredient] = { quantity: ingredient.quantity, unit: ingredient.unit }
  });
  // Compares elements from the new ingredients array to old ingredients and converts as necessary
  let results = [];
  ingredients.forEach(newIngredient => {
    let old = ingredientsObj[newIngredient.ingredient];
    if (old && unitsList.includes(old.unit) && unitsList.includes(newIngredient.unit)) {
      newIngredient.quantity = convert(newIngredient.quantity).from(newIngredient.unit).to(old.unit);
      newIngredient.unit = old.unit;
      let combinedWithUnits = combine([newIngredient, { quantity: old.quantity, unit: old.unit, ingredient: newIngredient.ingredient }]);
      results.push(combinedWithUnits[0]);
    } else if (old && !old.unit && !newIngredient.unit) {
      let combinedWithoutUnits = combine([newIngredient, { quantity: old.quantity, unit: null, ingredient: newIngredient.ingredient }]);
      results.push(combinedWithoutUnits[0]);
    } else {
      results.push(newIngredient);
    }
  });
  return results;
};
//Listener====================================================
app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});