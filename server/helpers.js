const { parse, combine } = require('recipe-ingredient-parser');
const convert = require('convert-units');
const pluralize = require('pluralize');

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

  // Takes in two arrays of objects with quantity, unit, and ingredient properties
  const combineIngredientsKeepBoth = (ingredients, oldIngredients) => {
    try {
      let combinedIngredients = combineIngredients(ingredients, oldIngredients);
    } catch(err) {
      console.error('ERROR combining');
      throw err;
    }
    let filteredOldIngredients = oldIngredients.filter((oldIngredient) => {
      if (oldIngredient.ispurchased) {
        for (let combinedIngredient of combinedIngredients) {
          if (oldIngredient.ingredient === combinedIngredient.ingredient) {
            return false;
          }
        }
        return true
      }
    })
    return combinedIngredients.concat(filteredOldIngredients);
  };
  //====================================================
module.exports = {
  parseIngredients,
  combineIngredients,
  combineIngredientsKeepBoth,
  convert,
  combine,
  pluralize
};