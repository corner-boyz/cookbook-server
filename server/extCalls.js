const axios = require('axios');

const getRecipesByIngredients = (ingredients) => {
  // Turn passed in ingredients into query string
  const url = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?number=2&limitLicense=false&ranking=10&fillIngredients=true&ingredients=';
  let q = '';
  if (Array.isArray(ingredients)) {
    ingredients.forEach((ingredient, i) => {
      if (i !== ingredients.length - 1) {
        q += `${ingredient},`;
      } else {
        q += ingredient;
      }
    })
  } else {
    q = ingredients;
  }

  axios.get(url + q,
    {'headers': {'X-Mashape-Key': 'B3bHYE2wj1msh8Wo6kABp93v6qjQp1H7VO8jsnjCmc9KRTNxCz',
    'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
    .then((results) => {
      console.log('SUCCESS finding recipes:', results.data);
    }).catch((err) => {
      console.error('ERROR: finding recipes', err);
    });
}

const getRecipeById = (id) => {
  const firstHalf = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/';
  const lastHalf = '/information?includeNutrition=true'
  
  axios.get(firstHalf + id + lastHalf,
    {'headers': {'X-Mashape-Key': 'B3bHYE2wj1msh8Wo6kABp93v6qjQp1H7VO8jsnjCmc9KRTNxCz',
    'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'}})
    .then((results) => {
      console.log('SUCCESS getting recipe:', results.data);
    }).catch((err) => {
      console.error('ERROR getting recipe:', err);
    });
}

module.exports = {
  getRecipesByIngredients,
  getRecipeById
}