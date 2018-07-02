const axios = require('axios');

const getRecipesByIngredients = (ingredients) => {
  // Turn passed in ingredients into query string
  const url = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?number=10&limitLicense=false&ranking=2&fillIngredients=true&ingredients=';
  let q = '';
  if (Array.isArray(ingredients)) {
    ingredients.forEach((ingredient, i) => {
      if (i !== ingredients.length - 1) {
        q += `${ingredient.ingredient},`;
      } else {
        q += ingredient.ingredient;
      }
    })
  } else {
    q = ingredients;
  }
  return axios.get(url + q,
    {'headers': {'X-Mashape-Key': process.env.SPOONACULAR_KEY,
    'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
    .then((results) => {
      console.log('REQUESTS REMAINING:', results.headers['x-ratelimit-requests-remaining']);
      console.log('RESULTS REMAINING:', results.headers['x-ratelimit-results-remaining']);
      return results.data;
    }).catch((err) => {
      return err;
    });
  
}

const getRecipeById = (id) => {
  const firstHalf = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/';
  const lastHalf = '/information?includeNutrition=true'
  
  return axios.get(firstHalf + id + lastHalf,
    {'headers': {'X-Mashape-Key': process.env.SPOONACULAR_KEY,
    'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
    .then((results) => {
      console.log('REQUESTS REMAINING:', results.headers['x-ratelimit-requests-remaining']);
      console.log('RESULTS REMAINING:', results.headers['x-ratelimit-results-remaining']);
      return results.data;
    }).catch((err) => {
      return err;
    });
}

module.exports = {
  getRecipesByIngredients,
  getRecipeById
}