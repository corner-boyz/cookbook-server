const axios = require('axios');

const getRecipesByIngredients = (ingredients) => {
  // Turn passed in ingredients into query string
  const url = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?number=5&limitLicense=false&ranking=10&fillIngredients=true&ingredients=';
  let q = '';
  if (Array.isArray(ingredients)) {
    ingredients.forEach((ingredient, i) => {
      if (i !== ingredients.length - 1) {
        q += `${ingredient.ingredient},`;
      } else {
        q += ingredient;
      }
    })
  } else {
    q = ingredients;
  }
  return new Promise((resolve, reject) => {
    axios.get(url + q,
      {'headers': {'X-Mashape-Key': process.env.SPOONACULAR_KEY,
      'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
      .then((results) => {
        console.log('REQUESTS REMAINING:', results.headers['x-ratelimit-requests-remaining']);
        console.log('RESULTS REMAINING:', results.headers['x-ratelimit-results-remaining']);
        resolve(results.data);
      }).catch((err) => {
        reject(err);
      });
  });
}

const getRecipeById = (id) => {
  const firstHalf = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/';
  const lastHalf = '/information?includeNutrition=true'
  
  return new Promise((resolve, reject) => {
    axios.get(firstHalf + id + lastHalf,
      {'headers': {'X-Mashape-Key': process.env.SPOONACULAR_KEY,
      'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
      .then((results) => {
        console.log('REQUESTS REMAINING:', results.headers['x-ratelimit-requests-remaining']);
        console.log('RESULTS REMAINING:', results.headers['x-ratelimit-results-remaining']);
        resolve(results.data);
      }).catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  getRecipesByIngredients,
  getRecipeById
}