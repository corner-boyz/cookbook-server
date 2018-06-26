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

app.use(bodyParser.json());
app.use(morgan('dev'));

app.get('/api/ingredients', (req, res) => {
  // This is just here temporarily to test the server
  const testIngredients = require('../database/testIngredients.json');
  res.send(testIngredients);
});

app.post('/api/ingredients', (req, res) => {
  const {email, ingredients} = req.body;
  Promise.all(dbHelpers.insertIngredients({email: email, ingredients: ingredients}))
    .then((results) => {
      console.log('SUCCESS inserting ingredients', results)
      res.send(results);
    }).catch((err) => {
      console.error('ERROR inserting ingredients', err)
      res.send(err);
  });
});

const units = {
  teaspoon: 'tsp',
  tablespoon: 'Tbs',
  ounce: 'fl-oz',
  cup: 'cup',
  pint: 'pnt',
  quart: 'qt',
  gallon: 'gal',
}

app.post('/api/combine', (req, res) => {
  // Takes two arrays of objects with quantity, unit, and ingredient properties
  const { ingredients, newIngredients } = req.body;
  // Converts the old ingredients array into an object
  let ingredientsObj = {};
  ingredients.forEach(ingredient => {
    ingredientsObj[ingredient.ingredient] = { quantity: ingredient.quantity, unit: ingredient.unit}
  });
  // Compares elements from the new ingredients array to old ingredients and converts as necessary
  let results = [];
  newIngredients.forEach(newIngredient => {
    let old = ingredientsObj[newIngredient.ingredient];
    if (old && units[old.unit] && units[newIngredient.unit]) {
      newIngredient.quantity = convert(newIngredient.quantity).from(units[newIngredient.unit]).to(units[old.unit]);
      newIngredient.unit = old.unit;
      let combinedWithUnits = combine([newIngredient, { quantity: old.quantity, unit: old.unit, ingredient: newIngredient.ingredient }]);
      results.push(combinedWithUnits[0]);
    } else if (old && !old.unit && !newIngredient.unit) {
      let combinedWithoutUnits = combine([newIngredient, { quantity: old.quantity, unit: old.unit, ingredient: newIngredient.ingredient }]);
      results.push(combinedWithoutUnits[0]);
    } else {
      results.push(newIngredient);
    }
  });
  res.send(results);
});

app.post('/api/parse', (req, res) => {
  const { ingredients } = req.body;
  let parsed = ingredients.map(ingredient => {
    let obj = parse(ingredient.toLowerCase());
    obj.ingredient = pluralize.singular(obj.ingredient);
    if (obj.unit) {
      obj.unit = pluralize.singular(obj.unit);
    }
    return obj;
  });
  res.send(parsed);
});

app.post('/api/recipelist', (req, res) => {
  //temporarily here to test server and client
  const testRecipes = require('./testRecipes.json');
  res.send(testRecipes);
})

app.post('/api/signup', (req, res) => {
  console.log(req.body);
  const { email, password, name } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      res.status(404).end();
    }
    dbHelpers.insertUser(email, hash, name);
    res.end('User saved!');
  });
});
app.post('/api/recipe', (req, res) => {
  //temporarily here to test server and client
  const testRecipe = require('./testRecipe.json');
  res.send(testRecipe);
})

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});