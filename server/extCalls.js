const axios = require('axios');
const unirest = require('unirest');

// const getImageByString = (ingredient) => {
//   const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_KEY}&image_type=vector&category=food&per_page=3&safesearch=true&q=${ingredient}`;
//   return axios.get(url).then((results) => {
//     // console.log('HEADERS', results.headers);
//     if (results.data.hits.length) {
//       return results.data.hits[0].previewURL;
//     } else {
//       return undefined;
//     }
//   }).catch((err) => {
//     console.error('Pixabay limiting use');
//     return undefined;
//   });
// }

const getImageByString = (ingredient) => {
  return new Promise((resolve, reject) => {
    unirest.post("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/food/detect")
    .header("X-Mashape-Key", process.env.SPOONACULAR_KEY)
    .header("X-Mashape-Host", "spoonacular-recipe-food-nutrition-v1.p.mashape.com")
    .header("Content-Type", "application/x-www-form-urlencoded")
    .send("text=" + ingredient)
    .end(function (result) {
    if (result.body.annotations.length) {
      resolve(result.body.annotations[0].image)
    }
    });
  });
}

const getRecipesByIngredients = (ingredients) => {
  // Turn passed in ingredients into query string
  const url = 'https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/findByIngredients?number=20&limitLicense=false&ranking=2&fillIngredients=true&ingredients=';
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
    q = ingredients.ingredients;
  }
  return axios.get(url + q,
    {
      'headers': {
        'X-Mashape-Key': process.env.SPOONACULAR_KEY,
        'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'
      }
    })
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
    {
      'headers': {
        'X-Mashape-Key': process.env.SPOONACULAR_KEY,
        'X-Mashape-Host': 'spoonacular-recipe-food-nutrition-v1.p.mashape.com'
      }
    })
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
  getRecipeById,
  getImageByString
}