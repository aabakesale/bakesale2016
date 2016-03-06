var google = require('googleapis');
var googleAuth = require('google-auth-library');
var key = require('./aabs.json');

var GoogleSpreadsheet = require("google-spreadsheet");


function placeOrder(order, res, sheetId) {
  var my_sheet = new GoogleSpreadsheet(sheetId);

  order.seq = '1';
  order.emailed = '0';
  order.date = new Date().toString();
  my_sheet.useServiceAccountAuth(key, function(err) {
    if (err) {
      console.log(err);
      res.send(400);
      return;
    }

    my_sheet.getInfo( function( err, sheet_info ){
      if (err) {
        console.log(err);
        res.send(400);
        return;
      }
      console.log( sheet_info.title + ' is loaded' );
      // use worksheet object if you want to stop using the # in your calls 
   
      var sheet1 = sheet_info.worksheets[0];
      sheet1.addRow(order, function(err) {
        if (err) {
          console.log(err);
          res.send(400);
          return;
        }
        res.render('thankyou', {sheetId: sheetId});
      });
    });
  });
}


function displayOffer(req, res, sheetId) {
  var sheet = new GoogleSpreadsheet(sheetId);
  sheet.useServiceAccountAuth(key, function(err) {
    if (err) {
      console.log(err);
      res.set('Content-Type', 'plain/text');
      res.send(422);
      return;
    }
    sheet.getInfo( function(err, sheetInfo) {
      if (err) {
        console.log(err);
        res.set('Content-Type', 'plain/text');
        res.send(422);
        return;
      }
      console.log(sheetInfo.title + ' is loaded!!' );
      var sheet1 = sheetInfo.worksheets[0];
      sheet1.getCells({"min-row":2, "max-row":2, "min-col":3, "max-col":4}, function(err, data) {
        var metadataRows = data[0].value;
        var metadataColumns = data[1].value;

        var maxCol = sheet1.colCount;
        var option = {"min-row":1, "max-row":metadataRows, "min-col":1, "max-col":maxCol};
        sheet1.getCells(option, function(err, data) {
          if (err) {
            console.log(err);
            res.set('Content-Type', 'plain/text');
            res.send(422);
            return;
          }

          var actualMaxColumn = 0; //last column should be omitted
          var rowsIdx = {};
          var showState = {};
          for (var i = 0; i < data.length; i += 1) {
            if (data[i].col == 1)
              rowsIdx[data[i].row] = data[i].value;
            else if (data[i].col == 2)
              showState[data[i].row] = data[i].value;
            if (data[i].col > actualMaxColumn)
              actualMaxColumn = data[i].col;
          }
          showState[1] = 'show'; //hack (overwrite by "date")
          rowsIdx[1] = 'Item'; //hack (overwrite by "seq")
          console.log(rowsIdx);
          console.log(showState);

          var info = {};
          for (var i = 0; i < data.length; i += 1) {
            var cell = data[i];
            if (data[i].col > metadataColumns && data[i].col < actualMaxColumn && showState[data[i].row] !== 'hide') {
              if (info[data[i].col] === undefined)
                info[data[i].col] = {};
              info[data[i].col][rowsIdx[data[i].row]] = data[i].value;
            }
          }
          
          var keys = Object.keys(info[Object.keys(info)[0]]);
          var meta = { title: sheetInfo.title };
          console.log(keys);
          res.render('index', {info: info, keys: keys, sheetId: sheetId, meta: meta});
        });
      });

    });
  });
}

module.exports = {
  placeOrder: placeOrder,
  displayOffer: displayOffer
};
