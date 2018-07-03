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
  dbHelpers.selectIngredients({ email: email, table: table }).then((results) => {
    console.log('SUCCESS getting ingredients from DB');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR getting ingredients from DB', err);
    res.status(404).end();
  })
});

app.get('/api/grocerylist/:email', (req, res) => {
  const { email } = req.params;
  const table = 'grocerylist';
  dbHelpers.selectIngredients({ email: email, table: table }).then((results) => {
    console.log('SUCCESS getting ingredients from DB');
    res.send(results);
  }).catch((err) => {
    console.error('ERROR getting ingredients from DB', err);
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

app.get('/api/userRecipes/:email', (req, res) => {
  const { email } = req.params;
  // console.log('Server - Email: ', email);
  dbHelpers.fetchUserRecipes({ email: email })
    .then((results) => {
      res.send(results);
    })
})
//Post Requests====================================================
app.post('/api/ingredients', (req, res) => {
  const { email, ingredients, shouldReplace } = req.body;
  const table = 'ingredients';
  ingredients.forEach(object => {
    object.ingredient = helpers.pluralize.singular(object.ingredient);
  });
  Promise.all(dbHelpers.insertIngredients({ email: email, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
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
});

app.post('/api/grocerylist', async (req, res) => {
  const { email, ingredients, shouldReplace} = req.body;
  // console.log('PURCHASE', ingredients[0].ispurchased)
  const table = 'grocerylist';
  ingredients.forEach(object => {
    object.ingredient = helpers.pluralize.singular(object.ingredient);
  });
  await Promise.all(dbHelpers.insertIngredients({ email: email, ingredients: ingredients, shouldReplace: shouldReplace, table: table }))
    .then((results) => {
      console.log('SUCCESS inserting into groceryList', results);
      return dbHelpers.groceryListIntoIngredients({email: email});
    })
    .then((results) => {
      console.log('SUCCESS inserting into ingredients from groceryList');
      return dbHelpers.deleteGroceries({ email: email, table: table });
    })
    .then((results) => {
      console.log('SUCCESS deleting groceries with 0 quantities');
      res.send(results);
    })
    .catch((err) => {
      console.error('ERROR inserting into groceryList', err);
      res.status(404).end();
    });
});

app.post('/api/combine', (req, res) => {
  const { ingredients, oldIngredients } = req.body;
  res.send(helpers.combineIngredients(ingredients, oldIngredients));
});

app.post('/api/parse', (req, res) => {
  const { ingredients } = req.body;
  res.send(helpers.parseIngredients(ingredients));
});

app.post('/api/saverecipe', (req, res) => {
  const { email, recipe } = req.body;
  const { id, title, image } = recipe;
  dbHelpers.saveRecipe({ email: email, id: id, title: title, image: image })
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
  console.log('search', req.body)
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
      res.status(404).end();
    }
    dbHelpers.insertUser({ email: email, password: hash, name: name }).then(() => {
      res.end('User saved!');
    }).catch((err) => {
      console.log('Error in saving new user to the database', err);
      res.status(404).end();
    })
  });
});

//Testing====================================================
const tester = () => {
  ingredients = dbHelpers.selectIngredients({email: 'theohzonelayer@gmail.com', table: 'ingredients'})
  .then((results) => {
    oldIngredients = results;
    ingredients = [
      {ingredient: 'sugar', quantity: 100, unit: 'oz'},
      {ingredient: 'salt', quantity: 70, unit: 'oz'},
    ];
    console.log('COMBINE', helpers.combineIngredients(ingredients, oldIngredients));
  });
}
// tester();
//Listener====================================================
app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});