const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const dbHelpers = require('../database/dbHelpers');
const helpers = require('./helpers');
const extCalls = require('./extCalls');

const app = express();

const { parse, combine } = require('recipe-ingredient-parser');
const convert = require('convert-units');

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
  const { email } = req.params;
  const table = 'ingredients';
  dbHelpers.selectIngredients({ email: email, table: table }).then((ingredients) => {
    console.log('SUCCESS getting ingredients from DB');
    res.send(ingredients);
  }).catch((err) => {
    console.error('ERROR getting ingredients from DB', err);
    res.status(404).end();
  });
});

app.get('/api/grocerylist/:email', (req, res) => {
  const { email } = req.params;
  const table = 'grocerylist';
  dbHelpers.selectIngredients({ email: email, table: table }).then((ingredients) => {
    console.log('SUCCESS getting groceryList from DB');
    res.send(ingredients);
  }).catch((err) => {
    console.error('ERROR getting groceryList from DB', err);
    res.status(404).end();
  })
});

app.get('/api/recipe/:recipeId', (req, res) => {
  const { recipeId } = req.params;
  extCalls.getRecipeById(recipeId).then((results) => {
    console.log('SUCCESS getting recipe from Spoonacular');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR getting recipe from Spoonacular', err);
    res.status(404).end();
  });

  // Uncomment if wanting to use test data
  // const testRecipe = require('./testRecipe.json');
  // res.send(testRecipe);
});

app.get('/api/saverecipe/:recipeId/:email', (req, res) => {
  const { recipeId, email } = req.params;
  console.log('ID', recipeId, 'EMAIL', email)
  dbHelpers.selectRecipe({ email: email, recipeId: recipeId }).then((results) => {
    console.log('SUCCESS selecting recipe', results);
    res.send(results);
  }).catch((err) => {
    console.log('ERROR selecting recipe', err);
  });
});

app.get('/api/userrecipes/:email', (req, res) => {
  const { email } = req.params;
  // console.log('Server - Email: ', email);
  dbHelpers.fetchUserRecipes({ email: email })
    .then((results) => {
      res.send(results);
    });
});

app.get('/api/userextensionrecipes/:email', (req, res) => {
  const { email } = req.params;
  // console.log('Server - Email: ', email);
  dbHelpers.fetchUserExtensionRecipes({ email: email })
    .then((results) => {
      res.send(results);
    });
});

app.get('/api/usercombinedrecipes/:email', (req, res) => {
  const { email } = req.params;
  dbHelpers.fetchUserRecipes({ email: email })
    .then((results) => {
      dbHelpers.fetchUserExtensionRecipes({ email: email })
        .then((newResults) => {
          res.send(results.concat(newResults));
        });
    });
});
//Post Requests====================================================
app.post('/api/ingredients', (req, res) => {
  const { email, ingredients, shouldReplace } = req.body;
  const table = 'ingredients';
  ingredients.forEach(object => {
    if (object.ingredient !== 'ramen') {
      object.ingredient = helpers.pluralize.singular(object.ingredient);
    }
  });
  dbHelpers.selectIngredients({ email: email, table: table}).then((oldIngredients) => {
    try {
      Promise.all(dbHelpers.insertIngredients({ email: email, oldIngredients: oldIngredients, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
        .then((results) => {
          console.log('SUCCESS inserting ingredients');
          dbHelpers.deleteIngredients({ email: email, table: table }).then((results) => {
            console.log('SUCCESS deleting ingredients with 0 quantities');
          }).then((results) => {
            res.send(results);
          });
        }).catch((err) => {
          console.error('ERROR inserting ingredients', err);
          res.status(404).end();
        });
    } catch(err) {
      console.error('ERROR converting units', err);
      res.status(406).end(err);
    }
  });
});

app.post('/api/grocerylist', (req, res) => {
  const { email, ingredients, shouldReplace} = req.body;
  const table = 'grocerylist';
  ingredients.forEach(object => {
    if (object.ingredient !== 'ramen') {
      object.ingredient = helpers.pluralize.singular(object.ingredient);
    }
  });
  
  dbHelpers.selectIngredients({ email: email, table: table}).then((oldIngredients) => {
    try {
      Promise.all(dbHelpers.insertIngredients({ email: email, oldIngredients: oldIngredients, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
        .then((results) => {
          console.log('SUCCESS inserting into ingredients from groceryList');
          return dbHelpers.deleteGroceries({ email: email, table: table });
        })
        .then((results) => {
          console.log('SUCCESS deleting purchased groceries or with 0 quantities');
          res.send(results);
        })
        .catch((err) => {
          console.error('ERROR inserting into groceryList', err);
          res.status(404).end();
        });
    } catch(err) {
      console.error('ERROR converting units', err);
      res.status(406).end(err);
    }
  });
});

app.post('/api/grocerylistcheckboxes', (req, res) => {
  const { email, ingredients, shouldReplace} = req.body;
  const table = 'grocerylist';
  ingredients.forEach(object => {
    if (object.ingredient !== 'ramen') {
      object.ingredient = helpers.pluralize.singular(object.ingredient);
    }
  });
  
  dbHelpers.selectIngredients({ email: email, table: table}).then((oldIngredients) => {
    Promise.all(dbHelpers.insertIngredients({ email: email, oldIngredients: oldIngredients, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
      .then((results) => {
        console.log('SUCCESS inserting into ingredients from groceryList');
        res.send(results);
      })
      .catch((err) => {
        console.error('ERROR inserting into groceryList', err);
        res.status(404).end();
      });
  });
});

app.post('/api/grocerylistintopantry', (req, res) => {
  const { email, ingredients, shouldReplace} = req.body;
  const table = 'grocerylist';
  ingredients.forEach(object => {
    if (object.ingredient !== 'ramen') {
      object.ingredient = helpers.pluralize.singular(object.ingredient);
    }
  });
  
  dbHelpers.selectIngredients({ email: email, table: 'ingredients'}).then((pantryIngredients) => {
    dbHelpers.selectIngredients({ email: email, table: table}).then((oldIngredients) => {
      Promise.all(dbHelpers.insertIngredientsByKeeping({ email: email, oldIngredients: oldIngredients, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
        .then((results) => {
          console.log('SUCCESS inserting into groceryList', results);
          return dbHelpers.selectPurchasedGroceryList({ email: email });
        })
        .then((groceryIngredients) => {
          return Promise.all(dbHelpers.insertIngredientsByKeeping({ email: email, oldIngredients: pantryIngredients, ingredients: groceryIngredients, shouldReplace: !shouldReplace, table: 'ingredients' }));
        })
        .then((results) => {
          console.log('SUCCESS inserting into ingredients from groceryList');
          return dbHelpers.deletePurchasedGroceries({ email: email, table: table });
        })
        .then((results) => {
          console.log('SUCCESS deleting groceries with 0 quantities');
          res.send(results);
        })
        .catch((err) => {
          console.error('ERROR converting units', err);
          res.status(406).end(err);
        });
    });
  });
});

app.post('/api/groceryitemintopantry', (req, res) => {
  const { email, ingredients, shouldReplace} = req.body;
  const table = 'grocerylist';
  ingredients.forEach(object => {
    if (object.ingredient !== 'ramen') {
      object.ingredient = helpers.pluralize.singular(object.ingredient);
    }
  });
  let oldIngredients = ingredients;
  dbHelpers.selectIngredients({ email: email, table: 'ingredients'}).then((pantryIngredients) => {
      Promise.all(dbHelpers.insertIngredientsByKeeping({ email: email, oldIngredients: oldIngredients, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
        .then((results) => {
          console.log('SUCCESS inserting into groceryList', results);
          return Promise.all(dbHelpers.insertIngredientsByKeeping({ email: email, oldIngredients: pantryIngredients, ingredients: oldIngredients, shouldReplace: !shouldReplace, table: 'ingredients' }));
        })
        .then(() => {
          console.log('SUCCESS inserting into ingredients from groceryList');
          return dbHelpers.deleteSpecificGrocery({ email: email, table: table, ingredient: oldIngredients[0].ingredient });
        })
        .then((results) => {
          console.log('SUCCESS deleting purchased groceries or with 0 quantities');
          res.send(results);
        })
        .catch((err) => {
          console.error('ERROR converting units', err);
          res.status(406).end(err);
        });
  });
});

app.post('/api/combine', (req, res) => {
  const { ingredients, oldIngredients } = req.body;
  res.send(helpers.combineIngredients(ingredients, oldIngredients));
});

app.post('/api/combineExtension', (req, res) => {
  const { ingredients, oldIngredients } = req.body;
  res.send(helpers.combineIngredientsExtension(ingredients, oldIngredients));
});

app.post('/api/compare', (req, res) => {
  const { recipe, ingredients } = req.body;
  res.send(helpers.compareIngredients(recipe, ingredients));
});

app.post('/api/compareExtension', (req, res) => {
  const { recipe, ingredients } = req.body;
  recipe.forEach(ingredient => {
    ingredient.quantity *= -1;
  });
  res.send(helpers.combineIngredientsExtension(recipe, ingredients));
});

app.post('/api/comparetorecipe', (req, res) => {
  const { recipe, ingredients } = req.body;
  // console.log('recipe', recipe)
  const difference = helpers.compareIngredientsKeepBoth(helpers.formatIngredients(recipe), ingredients);
  const filtered = difference.filter((ingredient) => {
    return ingredient.quantity > 0
  });
  filtered.forEach((ingredient) => {
    ingredient.ispurchased = false;
  })
  res.send(filtered);
});

app.post('/api/parse', (req, res) => {
  const { ingredients } = req.body;
  res.send(helpers.parseIngredients(ingredients));
});

app.post('/api/formatparse', (req, res) => {
  const { ingredients } = req.body;
  res.send(helpers.formatIngredients(ingredients));
});

app.post('/api/saverecipe', (req, res) => {
  const { email, recipe, isExtension = false } = req.body;
  const { id, title, image, sourceUrl } = recipe;
  dbHelpers.saveRecipe({ email: email, id: id, title: title, image: image, sourceUrl: sourceUrl, isExtension: isExtension })
    .then((results) => {
      console.log('SUCCESS saving recipe');
      res.send(results);
    }).catch((err) => {
      console.error('ERROR saving recipe', err);
      res.status(404).end();
    });
});

app.patch('/api/saverecipe', (req, res) => {
  const { email, recipe } = req.body;
  const { id } = recipe;
  dbHelpers.deleteRecipe({ email: email, id: id })
    .then((results) => {
      console.log('SUCCESS deleting recipe');
      res.send(results);
    }).catch((err) => {
      console.error('ERROR deleting recipe', err);
      res.status(404).end();
    });
});

app.post('/api/recipelist', (req, res) => {
  extCalls.getRecipesByIngredients(req.body).then((results) => {
    console.log('SUCCESS getting recipeList from Spoonacular');
    res.send(results);
  }).catch((err) => {
    console.log('ERROR getting recipeList from Spoonacular', err);
    res.status(404).end();
  });
  // const testRecipes = require('./testRecipes.json');
  // res.send(testRecipes);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  dbHelpers.selectUser({ email: email }).then(results => {
    if (!results.length) {
      res.end('Wrong email or password');
    } else {
      let user = results[0];
      bcrypt.compare(password, user.password).then(doesMatch => {
        if (doesMatch) {
          res.send({ email: user.email, name: user.name });
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
      res.status(406).end();
    }
    dbHelpers.insertUser({ email: email, password: hash, name: name }).then(() => {
      res.end('User saved!');
    }).catch((err) => {
      console.log('Error in saving new user to the database', err);
      res.status(406).end();
    })
  });
});
//Listener====================================================
app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});