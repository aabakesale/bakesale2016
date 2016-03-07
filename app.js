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
  bakeApi.displayOffer(req, res, '1TuqlBzU9oGAaExc3lXtZK2wiI9mcdSeN_1DMyYFALIs');
});

app.post('/:sheetId/submit', function(req, res) {
  console.log(req.body);
  order = req.body.order;
  bakeApi.placeOrder(order, res, req.params.sheetId);
});

app.get('/:sheetId', function(req, res) {
  console.log(req.params.sheetId);
  bakeApi.displayOffer(req, res, req.params.sheetId);
});


// routes for receipts
app.get('/:sheetId/receipts', function(req, res) {
  var v = req.query.passcode;
  var sheetId = req.params.sheetId;
  var askPasscode = function(req, res, sheetId, oldPasscode, meta) {
    res.render('passcode', {meta: meta, sheetId: sheetId, action:'receipts'});
  }
  var verifyPasscode = (function(v, req, res, sheetId, oldPasscode, meta) {
    if (v === oldPasscode) {
      console.log("Correct!");
      bakeApi.generateReceipts(req, res, sheetId);
    } else {
      console.log("Incorrect!");
      res.render('passcode', {meta: meta, sheetId: sheetId, action:'receipts', wrongMessage: true});
    }
  }).bind(null, v);

  if (v === undefined)
    bakeApi.generatePasscode(req, res, req.params.sheetId, askPasscode);
  else
    bakeApi.generatePasscode(req, res, req.params.sheetId, verifyPasscode);
});



// start server
app.listen(7000, function () {
    console.log('Example app listening on port 7000!');
});

