var express = require('express');
var bakeApi = require('./bake_api.js');
var app = express();


// body parser handling POST params
var bodyParser = require('body-parser');
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

// template engine: jade
app.set('view engine', 'jade');

// static files
app.use(express.static(__dirname + '/public'));


// routes
app.get('/', function(req, res) {
  res.render('index');
});

app.post('/submit', function(req, res) {
  console.log(req.body);
  order = req.body.order;
  bakeApi.placeOrder(order, res);
});




// start server
app.listen(7000, function () {
    console.log('Example app listening on port 7000!');
});

