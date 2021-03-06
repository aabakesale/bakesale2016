var google = require('googleapis');
var googleAuth = require('google-auth-library');
var key = require('./aabs.json');

var GoogleSpreadsheet = require("google-spreadsheet");

function selectSheetByNameOrDie(req, res, sheetInfo, name) {
  var sheet = null;
  for (var i = 0; i < sheetInfo.worksheets.length; i++)
    if (sheetInfo.worksheets[i].title === name)
      sheet = sheetInfo.worksheets[i];
  if (sheet === null) {
    console.log("worksheet '" + name + "' is not found!!");
    res.set('Content-Type', 'plain/text');
    res.send(500);
  }
  return sheet;
}

function getColumnInfoAndSheet(req, res, sheetId, callback) {
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
      var sheet1 = selectSheetByNameOrDie(req, res, sheetInfo, 'realdata');
      if (sheet1 == null) return;

      sheet1.getCells({"min-row":2, "max-row":2, "min-col":3, "max-col":4}, function(err, data) {
        if (err) {
          console.log(err);
          res.send(500);
          return;
        }
        if (data.length < 2) {
          console.log(err);
          res.send(500);
          return;
        }
        var metadataRows = parseInt(data[0].value);
        var metadataColumns = parseInt(data[1].value);

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
          
          // display keys
          var keys = [];
          for (var i = 1; i <= metadataRows; i++) {
            if (showState[i] === 'show')
              keys.push(rowsIdx[i]);
          } 
          //console.log(unitPricesRow, unitPricesName);
          //console.log(metadataColumns);
          var unitPrices = {};
          
          //console.log(rowsIdx);
          //console.log(showState);

          var info = {};
          for (var i = 0; i < data.length; i += 1) {
            var cell = data[i];
            if (data[i].col > metadataColumns && data[i].col < actualMaxColumn) {
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

          //var keys = Object.keys(info[Object.keys(info)[0]]);
          var meta = { title: sheetInfo.title };

          
          var sheet2 = selectSheetByNameOrDie(req, res, sheetInfo, 'formdata');
          if (sheet2 == null) return;

          sheet2.getRows(2, function(err, data) {
            if (err) {
              console.log(err);
              res.send(500);
              return;
            }
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

function placeOrder(order, req, res, sheetId) {
  var my_sheet = new GoogleSpreadsheet(sheetId);

  order.seq = '1';
  order.emailed = '0';
  order.date = new Date().toString();

  var callback = function(req, res, sheetId, meta, sheet) {
    for (var i in meta.info) {
      var col = meta.info[i];
      if (col['limit'] !== undefined) {
        console.log(order[col['Item']], ";", parseInt(Number(order[col['Item']])));
        console.log(col['limit'], ";", Math.max(0, parseInt(Number(col['limit']))));
        if (order[col['Item']] !== undefined && parseInt(Number(order[col['Item']])) > Math.max(0, parseInt(Number(col['limit'])))) {
          console.log("bad request");
          res.set('Content-Type', 'text/plain');
          res.send("對不起，訂單 「" + col['Item'] + "」 已經全數售罄，請重新選購，謝謝！");
          return;
        }
      }
    }
    sheet.addRow(order, function(err) {
      if (err) {
        console.log(err);
        res.send(400);
        return;
      }
      sheet.getCells({"min-row":2, "max-row":2, "min-col":5, "max-col":5}, function(err, data) {
        contact = data[0].value;
        res.render('thankyou', {sheetId: sheetId, contact: contact});
      });
    });
  };

  getColumnInfoAndSheet(req, res, sheetId, callback);
}


function displayOffer(req, res, sheetId) {
  var callback = function(req, res, sheetId, meta, sheet) {
    res.render('index', {info: meta.info, keys: meta.keys, sheetId: sheetId, meta: meta.meta, unitPrices: meta.unitPrices, messages: meta.messages, formSpec: meta.formSpec});
  };
  getColumnInfoAndSheet(req, res, sheetId, callback);
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
      var sheet1 = selectSheetByNameOrDie(req, res, sheetInfo, 'realdata');
      if (sheet1 == null) return;
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
    var allData = [];
    var recursiveCallback = function(nextRows, allData, err, data) {
      if (err) {
        console.log(err);
        res.send(422);
        return;
      }
      console.log(nextRows, " -- XD -- ", data.length, " >>>> ", allData.length);
      if (data.length == 0) {

        // WTF: the column names are automatically whitespaces removed!!!
        for (var i in meta.info) {
          meta.info[i].Item = meta.info[i].Item.replace(/ /g,'');
        }

        res.render('receipts', {meta: meta.meta, info: meta.info, data: allData, unitPrices: meta.unitPrices});
        return;
      }
      for (var i in data) allData.push(data[i]);
      nextRows = nextRows + data.length;
      sheet.getRows({offset: nextRows, limit: 20}, recursiveCallback.bind(null, nextRows, allData));
      return;
    };
    sheet.getRows({offset: metadataRows + 1, limit: 20}, recursiveCallback.bind(null, metadataRows+1, allData));
  };
  getColumnInfoAndSheet(req, res, sheetId, callback);
}

module.exports = {
  placeOrder: placeOrder,
  displayOffer: displayOffer,
  generatePasscode: generatePasscode,
  generateReceipts: generateReceipts
};
