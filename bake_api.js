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
        sheet1.getCells({"min-row":2, "max-row":2, "min-col":5, "max-col":5}, function(err, data) {
          contact = data[0].value;
          res.render('thankyou', {sheetId: sheetId, contact: contact});
        });
      });
    });
  });
}


function getColumnInfoAnsSheet(req, res, sheetId, callback) {
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
          var unitPricesName, unitPricesRow;
          for (var i = 0; i < data.length; i += 1) {
            if (data[i].col == 1)
              rowsIdx[data[i].row] = data[i].value;
            else if (data[i].col == 2)
              showState[data[i].row] = data[i].value;
            if (data[i].col > actualMaxColumn)
              actualMaxColumn = data[i].col;
            if (data[i].col == parseInt(metadataColumns) && data[i].value == '*')
              unitPricesRow = data[i].row;
          }
          showState[1] = 'show'; //hack (overwrite by "date")
          rowsIdx[1] = 'Item'; //hack (overwrite by "seq")
          unitPricesName = rowsIdx[unitPricesRow];
          //console.log(unitPricesRow, unitPricesName);
          //console.log(metadataColumns);
          var unitPrices = {};
          
          //console.log(rowsIdx);
          //console.log(showState);

          var info = {};
          for (var i = 0; i < data.length; i += 1) {
            var cell = data[i];
            if (data[i].col > metadataColumns && data[i].col < actualMaxColumn && showState[data[i].row] !== 'hide') {
              if (info[data[i].col] === undefined)
                info[data[i].col] = {};
              info[data[i].col][rowsIdx[data[i].row]] = data[i].value;
            }
            if (data[i].row == unitPricesRow)
              unitPrices[data[i].col] = data[i].value;
          }


          //handling messages
          var messages = {};
          var startRow = 0, endRow = -1, startColumn = 0;
          for (var i = 0; i < data.length; i += 1) {
            if (data[i].value == "display-messages-begin") {
              startRow = data[i].row + 1;
              startColumn = data[i].col;
            }
            if (data[i].value == "display-messages-end") {
              endRow = data[i].row - 1;
            }
          }
          for (var i = 0; i < data.length; i += 1) {
            if (data[i].row >= startRow && data[i].row <= endRow) {
              if (data[i].col == startColumn || data[i].col == startColumn + 1) {
                if (messages[data[i].row] === undefined) messages[data[i].row] = [];
                messages[data[i].row][data[i].col - startColumn] = data[i].value;
              }
            }
          }
          messages = Object.keys(messages).map(function(v) { return messages[v]; });


          var keys = Object.keys(info[Object.keys(info)[0]]);
          var meta = { title: sheetInfo.title };

          
          var sheet2 = sheetInfo.worksheets[1];
          sheet2.getRows(2, function(err, data) {
            var titles = Object.keys(data[0]);
            var headers = [];
            var options = [];
            var start = 0;
            for(var i in titles) {
              if (titles[i] === 'columnnames')
                start = 1;
              if (titles[i] === 'beginofoptions')
                start = 2;
              if (titles[i] === 'endofoptions')
                start = 0;
              if (start == 1) 
                headers.push(titles[i]);
              if (start == 2 && titles[i].substring(0, 6) === "option")
                options.push(titles[i]);
            }
            var formSpec = [];
            for(var i in data) {
              var row = data[i];
              var purifiedRow = {};
              var opt = {};
              for(var j in headers) {
                purifiedRow[headers[j]] = row[headers[j]];
              }
              for(var j in options) {
                opt[row[options[j]]] = row['display' + options[j]];
              }
              purifiedRow.options = opt;
              formSpec.push(purifiedRow);
            }
            callback(req, res, sheetId, { info: info, keys: keys, meta: meta, unitPrices: unitPrices, messages: messages, metadataRows: metadataRows, metadataColumns: metadataColumns, formSpec: formSpec }, sheet1);
          });
        });
      });
    });
  });
}


function displayOffer(req, res, sheetId) {
  var callback = function(req, res, sheetId, meta, sheet) {
    res.render('index', {info: meta.info, keys: meta.keys, sheetId: sheetId, meta: meta.meta, unitPrices: meta.unitPrices, messages: meta.messages, formSpec: meta.formSpec});
  };
  getColumnInfoAnsSheet(req, res, sheetId, callback);
}


/* callback should have the form (req, res, sheetId, oldPassword, meta) */
function generatePasscode(req, res, sheetId, callback) {
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
      var sheet1 = sheetInfo.worksheets[0];
      // passcode should be store at E3
      sheet1.getCells({"min-row":3, "max-row":3, "min-col":5, "max-col":5}, function(err, data) {
        var v = data[0].value.substr(10);
        var w = ("0000" + parseInt(Math.random() * 10000)).slice(-4);
        console.log(v);
        if (v === "") v = parseInt(Math.random() * 10000);
        data[0].value = "passcode: " + w;
        data[0].save(function(err) {
          if (err) {
            console.log(err);
            res.send(422);
            return;
          }
          callback(req, res, sheetId, v, {title: sheetInfo.title});
        });
      });
    });
  });
}

function generateReceipts(req, res, sheetId) {
  var callback = function(req, res, sheetId, meta, sheet) {
    var metadataRows = parseInt(Number(meta.metadataRows));
    sheet.getRows({offset: metadataRows + 1}, function(err, data) {
      if (err) {
        console.log(err);
        res.send(422);
        return;
      }
      res.render('receipts', {meta: meta.meta, info: meta.info, data: data});
    });
  };
  getColumnInfoAnsSheet(req, res, sheetId, callback);
}

module.exports = {
  placeOrder: placeOrder,
  displayOffer: displayOffer,
  generatePasscode: generatePasscode,
  generateReceipts: generateReceipts
};
