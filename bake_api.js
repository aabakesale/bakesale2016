var google = require('googleapis');
var googleAuth = require('google-auth-library');
var key = require('./aabs.json');

var GoogleSpreadsheet = require("google-spreadsheet");

var sheetId = '1TuqlBzU9oGAaExc3lXtZK2wiI9mcdSeN_1DMyYFALIs';
var my_sheet = new GoogleSpreadsheet(sheetId);


function placeOrder(order, res) {

  order.seq = '1';
  order.emailed = '0';
  my_sheet.useServiceAccountAuth(key, function(err) {
    console.log(err);

    my_sheet.getInfo( function( err, sheet_info ){
      console.log( sheet_info.title + ' is loaded' );
      // use worksheet object if you want to stop using the # in your calls 
   
      var sheet1 = sheet_info.worksheets[0];
      console.log(sheet1.rowCount);
      sheet1.addRow(order, function() {
          res.render('thankyou');
      });
    });
  });
}

module.exports = {
  placeOrder: placeOrder
};
