var express = require('express');
var connect = require('connect');
var app = express();
var mongoose = require('mongoose');
var mongouri = "mongodb://pro:softs_2831@ds021333.mlab.com:21333/euphony";

mongoose.connect(mongouri);
console.log("Connected to db");

var port = process.env.PORT || 8080;
//configuration

app.use(express.static(__dirname + '/public'));
app.use(connect.logger('dev'));
app.use(connect.json());
app.use(connect.urlencoded());
//routes

require('./routes/routes.js')(app);
app.listen(port);
console.log("The app running on port " + port);
