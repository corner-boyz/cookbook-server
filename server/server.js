const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const app = express();

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

app.listen(process.env.PORT || 3000, () => {
  console.log(`Listening on port ${process.env.PORT || 3000}!`);
});