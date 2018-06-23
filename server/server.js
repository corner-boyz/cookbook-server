const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const dbHelpers = require('../database/dbHelpers');

const app = express();

const { parse, combine } = require('recipe-ingredient-parser');
const convert = require('convert-units');
const pluralize = require('pluralize');

app.use(bodyParser.json());
app.use(morgan('dev'));

app.get('/api/ingredients', (req, res) => {
  // This is just here temporarily to test the server
  let ingredients = [
    {
      ingredient: 'Tomato',
      quantity: 5,
      unit: null,
    },
    {
      ingredient: 'Apple',
      quantity: 10,
      unit: null,
    },
    {
      ingredient: 'Avocado',
      quantity: 3,
      unit: null,
    },
    {
      ingredient: 'Bananas',
      quantity: 12,
      unit: null,
    }
  ];
  res.send(ingredients);
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
    let obj = parse(ingredient);
    obj.ingredient = pluralize.singular(obj.ingredient);
    if (obj.unit) {
      obj.unit = pluralize.singular(obj.unit);
    }
    return obj;
  });
  res.send(parsed);
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});