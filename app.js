
var express = require('express');
var connect = require('connect');
var app = express();
var mongoose = require('mongoose');

mongoose.connect('mongodb://pro:pro@ds023634.mlab.com:23634/euphony');
console.log("Connected to db");

var port = process.env.PORT || 8080;

var server = app.listen(port);
var io = require('socket.io').listen(server); 
//configuration
console.log("The app running on port " + port);

app.use(express.static(__dirname + '/public'));
app.use(connect.logger('dev'));
app.use(connect.json());
app.use(connect.urlencoded());
//routes

require('./routes/routes.js')(app);
var Conversation = require('./models/conversation');
var PendingConversation = require('./models/message');

var clients = [];

io.on('connection', function(socket) {
	console.log('user connected');
	socket.on('userId', function(id) {
		var user = {};
		user.id = id;
		user.socket_id = socket.id;
		user.online = "no";
		console.log(user);

		clients.push(user);

		PendingConversation.find({ to: id }, function(err, messages) {
			if(err)
				console.log(err);
			else {
				if(messages.length != 0) {
					messages.forEach(function(message) {
						socket.emit('message', message);
					});
				}
			}
		});
	});

	socket.on('message', function(data) {
		var message = data.message;
		var to = data.to;
		var frm = data.frm;
		console.log(data);

		var x = clients.every(function(client) {
			if(client.id == to) {
				io.to(client.socket_id).emit('message', { 'message': data, 'frm': frm});
				return false;
			} else
				return true;
		}); 

		if(x == true) {
			var pendingConversation = new PendingConversation();
			pendingConversation.to = to;
			pendingConversation.frm = frm;
			pendingConversation.message = message;

			pendingConversation.save(function(err) {
				if(err) 
					console.log(err);
			});
		}
   	}); 

   	socket.on('online', function(id) {
   		clients.forEach(function(client) {
   			if(client.id == id) 
   				client.online = "yes";
   		});
   	});

   	socket.on('status', function(id) {
   		var x = 0;

   		clients.forEach(function(client) {
   			if(client.id == id) {
   				x = 1;
   				socket.emit('status', { 'online': client.online }); 
   			}
   		});
   		if(x == 0)
   			socket.emit('status', { 'online': "no" });
   	});

});
