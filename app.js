var express = require('express');
var connect = require('connect');
var app = express();
var mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/node-euphony');
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