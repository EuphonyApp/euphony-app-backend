
var express = require('express');
var connect = require('connect');
var app = express();
var mongoose = require('mongoose');

mongoose.connect('mongodb://pro:pro_123@ds011705.mlab.com:11705/euphony');

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
	console.log(clients);
	socket.on('userId', function(id) {
		var user = {};
		user.id = id;
		user.socket_id = socket.id;
		user.online = "no";
		console.log(user);

		var x = clients.every(function(client) {
			if(client.id == id) {
				return false;
			} else
				return true;
		});

		if(x == true)
			clients.push(user);

		console.log(clients);

		PendingConversation.find({ to: id }, function(err, messages) {
			if(err)
				console.log(err);
			else {
				var x = messages.length;
				if(x != 0) {
					console.log(x);
					messages.forEach(function(message) {
						socket.emit('message', message);
						
						message.to = "";
						message.frm = "";
						message.message = "";
						
						message.save(function(err) {
							if(err) 
								console.log(err);
							else 
								console.log("pendong deleteed");
						});
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
				console.log("sent" + client.socket_id);
				var msg = {};
				msg.message = message;
				msg.frm = frm;
				console.log(msg);

				io.to(client.socket_id).emit('message', msg);
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
