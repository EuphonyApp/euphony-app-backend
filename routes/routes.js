var util = require('util');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Conversation = require('../models/conversation.js'); 
var FCM = require('fcm-push');
var fs = require('fs');
var geolib = require('geolib');

var serverKey = 'AIzaSyCrSeEQvwb8p3JDfu8zrEGndextsD0mHu8';
var fcm = new FCM(serverKey);

function UserSchema() {
	Schema.apply(this, arguments);
	this.add({
		name: String,
		type: String,
		location:String,
		f_id: String,
		g_id: String,
		twitter: String,
		pic: String,
		fbPage: String,
		following: [String],
		followers: [String],
		notifications: [String],
		gcm_token: String
	});
};

util.inherits(UserSchema, Schema);

var ArtistSchema = new UserSchema({
	email: String,
	genre: String,
	contact: String,
	subGenre: [String],
	utube: String,
	scloud: String,
	bands: [String],
	dis: String
});

var VenueSchema = new UserSchema({
	venue_name: String,
	email: String,
	contact: String,
	minCapacity: String,
	maxCapacity: String,

});

var BandSchema = new UserSchema({
	members: [String], 
	genre: String, 
	utube: String, 
	scloud: String,
	manager: String,
	manager_id: String,
	location: String,
	contact: String,
	subgenre: [String],
	positions: [String]																// add details
});

var LocationSchema = new Schema({
	user_id: String,
	track: String,
	coords: { type: [Number], index: '2d' }
});

var BookingSchema = new Schema({						// thinking of storing booking details as individual transactions in 
	booked: String,	
	booked_id: String,										// instead of storing in the artist, venue models
	bookedBy: String,
	bookedBy_id: String,
	time: String,
	date: String,
	type: String,
	status: String									
});

var JammingSchema = new Schema({						// thinking of storing booking details as individual transactions in 
	sender: String,	
	sender_id: String,										// instead of storing in the artist, venue models
	sent_to_id: String,
	sent_to: String,
	time: String,
	date: String,
	status: String									
});

var NotificationSchema = new Schema({
	details: String,
	pic: String,
	seen: String,
	option: String,
	type: String,
	attached_id: String
});

var User = mongoose.model('User', new UserSchema());
var Artist = User.discriminator('Artist',  ArtistSchema);
var Venue = User.discriminator('Venue', VenueSchema);
var Band = User.discriminator('Band', BandSchema);
var Location = mongoose.model('Location', LocationSchema);

var Booking = mongoose.model('Booking', BookingSchema);
var Jamming = mongoose.model('Jamming', JammingSchema);
var Notification = mongoose.model('Notification', NotificationSchema);

module.exports = function(app) {

	app.get('/', function(req, res) {
	res.json({ message: 'welcome to our api!' });	
   });														
																									  	// return user id if found in db
	app.get('/id', function(req, res) {																	//first funtion to call
		if(req.query.f_id != "no") {																	//if signed in with facebook
			User.find({ f_id: req.query.f_id}, function(err, docs) {
				if(err)																				
					res.end(err);
				else if(docs.length != 0) {
					console.log(req.query.f_id + " " + docs[0].__t);
					res.json(docs[0]._id + "," + docs[0].__t + "," + docs[0].location + "," + docs[0].name); 
				} else if(docs.length == 0) {
					console.log(req.query.f_id + " not found");
					res.json("null");
				}
			});
		} else if(req.query.g_id != "no") {																	// if signed in google+
			User.find({ g_id: req.query.g_id }, function(err, docs) {
				if(err)
					res.end(err);
				else if(docs.length != 0) {
					console.log(req.query.g_id + " " + docs[0]._id);
					res.json(docs[0]._id + "," + docs[0].__t + "," + docs[0].location + "," + docs[0].name);
				} else if(docs.length == 0) {
					console.log(req.query.g_id + " not fond");
					res.json("null");
				}
			});
		}
	});

	app.get('/user/all', function(req, res) {															// curently no used
		var user = {};																					// fetch all uses at a time
		var users = [];

		User.find(function(err, docs) {
			var x = docs.length;
			docs.forEach(function(doc) {
				if(doc.type != "venue" && doc._id != req.query.cur_id) {

					user._id = doc._id;
					user.name = doc.name;
					user.type = doc.type;
					user.pic = doc.pic;
					user.location = doc.location;

					if(doc.type == "band")
						user.members = doc.members.length;
					else {
						user.members = 0;
						user.type = doc.genre;
					}

					user.no_followers = doc.followers.length;
					if(doc.followers.indexOf(req.query.cur_id) > -1)
						user.followOrnot = "yes";
					else
						user.followOrnot = "no";
					users.push(user);
				}
				
				if(x == 1)
						res.json(users);
					else
						--x;
			});
		});
	});

	app.get('/user/ids', function(req, res) {												//fuction to fetch multiple user at a time with their ids
		var items = req.query.ids;															// params "ids" list of ids to fetch independent of type
		var user = {};
		var users = [];

		var x = items.length;

		items.forEach(function(item) {
			User.find({ _id: item}, function(err, docs) {

				if(err)
					res.end(err);

				user._id = docs[0]._id;
				user.name = docs[0].name;
				user.type = docs[0].type;
				user.pic = docs[0].pic;

				    if(docs[0].type != "artist")
					    user.type = docs[0].genre;

					if(docs[0]._id == req.query.cur_id) 
						user.followOrno = "";
					else if(docs[0].followers.indexOf(req.query.cur_id) > -1) 
						user.followOrno = "yes"; 
					else
						user.followOrno = "no";
					users.push(user);

				if(x == 1)
					res.json(users);
				else
					--x;
			});
		});
	});

	app.post('/follow', function(req, res) {	
	var followNotify = new Notification();
														//function for "follow" event
		User.find({ _id: req.query.follow }, function(err, docs) {									// params "cur_user" id, "follow" id to follow
			if(err) {
				console.log("follow error " + err);
				res.end(err);
			}

			docs[0].followers.push(req.query.cur_user);
			docs[0].save(function(err) {
				if(err) {
					console.log("error in svaing follow" + err);
					res.end(err);
				} else {
					User.find({ _id: req.query.cur_user}, function(err, users) {
					if(err) {
						console.log("follow " + err);
						res.end(err);
					}

					users[0].following.push(req.query.follow);
					users[0].save(function(err) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							var total = 0;
							docs[0].notifications.forEach(function(notification) {
								if(notification.type == "single_follow" && notification.seen == "no") {
									++total;
									docs[0].notifications.splice(docs[0].notifications.indexOf(notification), 1);
								}
							});

							if(total > 0) {
								followNotify.details = users[0].name + " and " + total + " others are now following You.";
								followNotify.type = "multi_follow";
							} else {
								followNotify.details = users[0].name + " is now following You.";
								followNotify.type = "single_follow";
							}

							followNotify.pic = users[0].pic;
							followNotify.option = "no";
							followNotify.seen = "no";	

							followNotify.save(function(err) {
								if(err) {
									console.log(err);
									res.send(err);
								} else {
									docs[0].notifications.unshift(followNotify._id);
									docs[0].save(function(err) {
										console.log("Success in following");
										
										var message = {
														    to: docs[0].gcm_token, // required
														    notification: {
														        title: 'Someone followed You',
														        body: followNotify.details,
														        click_action: 'OPEN_ACTIVITY_1'
														    }
														};

														fcm.send(message, function(err, response){
														    if (err) {
														        console.log("Something has gone wrong!");
														         console.log(err);
														        res.send(err);
														       
														    } else {
														        console.log("Successfully sent with response: ", response);
																res.json("followed");
														    }
														});
									});			
								}

							});
								}
							});

					
				  });
				}
			});
		});
	});

	app.post('/unfollow', function(req, res) {															// function for "un-follow" event
		User.find({ _id: req.query.unfollow }, function(err, docs) {									// params "cur_user" id, "unfollow" id of object to unfollow
			if(err) {
				console.log("unfollow error"  + err);
				res.end(err);
			}

			var index = docs[0].followers.indexOf(req.query.cur_user);

			if(index > -1) {
				docs[0].followers.splice(index, 1);
			}

			docs[0].save(function(err) {
				if(err)
					res.end(err);
				else {
					User.find({ _id: req.query.cur_user}, function(err, users) {
					if(err) {
						console.log("nfollow err "+ err);
						res.end(err);
					}
					var index = users[0].following.indexOf(req.query.unfollow);

					if(index > -1) {
						users[0].following.splice(index, 1);
						users[0].save(function(err) {
							if(err) {
								console.log(err);
								res.end(err);
							} else {
								console.log("saved");
								res.json({message: "Unfollowed"});
							}
					});
				}
			});
	       }
		});

	});
 });

	app.post('/artist', function(req, res) { 											// create an artist
		var artist = new Artist(req.body);												// params "artist" object

		artist.fbPage = "";
		artist.dis = "";
		artist.scloud = "";
		artist.twitter = "";

		artist.save(function(err) {
			if(err) {
				console.log("Error while creating user " + err);
				res.end(err);
			} else {
				console.log("created " + artist);

				var location = new Location();
				location.user_id = artist._id;
				location.track = "yes";
				location.coords = [];

				location.save(function(err) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						console.log("locatio created");
						res.json(artist._id);
					}
				});
			}
		});
	});

	app.post('/band', function(req, res) {												//create a band
		var band = new Band(req.body);													// params "band" object
		var bitmap = new Buffer(band.pic, 'base64');
		fs.writeFileSync(__dirname + "/profile_pics/" + band.id + ".jpeg", bitmap);
		band.pic = __dirname + "/profile_pics/" + band.id + ".jpeg";

		band.save(function(err) {
			if(err) {
				console.log("Error while creating band " + err);
				res.end(err);
			} else {
				var x = bands.members.length;
				bands.members.forEach(function(member) {
				Artist.find({ _id: member }, function(err, docs) {
					if(err)
						res.send(err);
					else {
						if(docs[0].bands.indexOf(band._id) == -1) {
							docs[0].bands.push(band._id);
							docs[0].save(function(err) {
								if(err)
									res.send(err);
								else {
									console.log("created " + band + docs[0].bands);
								}
							});
						}

						       		if(x == 1)
					        			res.json(band._id);
					        		else
					        			--x;
					}
				});
			});
			}
		});
	});

	app.post('/venue', function(req, res) {												//create a venue_name
		var venue = new Venue(req.body);												// params "venue" object

		venue.save(function(err) {
			if(err) {
				console.log("Error while creating venue" + err);
				res.send(err);
			} else {
				console.log("created venue"+ venue);
				res.json(venue._id);
			}
		});
	});

	app.get('/artist', function(req, res) {													//fetch an artist
		Artist.find({ _id: req.query.id }, function(err, artists) {							//params "cur_id" of the artist 
			if(err) {
				console.log("error while sending artist");
				res.end(err);
			} else {
				if(artists.length != 0) {
				var artist = artists[0];
				console.log("SEnt" + artist);
				res.json(artist);
			} else {
				var a  = new Artist();
				res.json(a);
			}
		}
		});
	});

	app.post('/artists', function(req, res) {										//dummy funtion to add multiple users
		var items = req.body;
		var x = items.length;

		items.forEach(function(item) {
		
			var artist = new Artist(item);
			artist.fbPage = "";
			artist.dis = "";
			artist.scloud = "";
			artist.twitter="";

			artist.save(function(err) {
				if(err)
					console.log("Error");
				else {
					console.log("Saved " + artist);
					if(x == 1)
						res.json({message: "Saved"});
					else
						--x;
				}
			});
		});
	});

	app.get("/usersInPart", function(req, res) {											//fetch users in part, 10 at a time
		var total = req.query.total;														//params "total", "offset", "type" ,"cur_id" of user
		var offset = req.query.offset;
		var type = req.query.type;

		var user = {};
		var users = [];

		var q = User.find({ type : type }).skip(offset).limit(total);
		q.exec(function(err, docs) { 
			var x = docs.length;
			console.log(x);

			if(docs.length == 0) {
				return res.json(users);
			} else {

			docs.forEach(function(doc) {
				if(doc._id != req.query.cur_id) {

					console.log(doc);
					user._id = doc._id;
					user.name = doc.name;
					user.type = doc.type;
					user.pic = doc.pic;
					user.location = doc.location;

					if(type == "bands")
						user.members = doc.members.length;
					else {
						user.members = 0;
						user.type = doc.genre;
					}

					user.no_followers = doc.followers.length;
					if(doc.followers.indexOf(req.query.cur_id) > -1)
						user.followOrnot = "yes";
					else
						user.followOrnot = "no";
					users.push(user);
				}
				
				if(x == 1) {
						console.log(total + offset + type + x);
						console.log(users);
						res.json(users);
					}
					else
						--x;
			});
		}
		});
	});

	app.get('/band/list', function(req, res) {													// get the lists of bands for one artist
																								// params "cur_id" of the artist
		var band = {};
		var bands = [];
		var ids = [];

		User.find({ _id : req.query.cur_id }, function(err, artist) {

			if(err) {
				console.log(err);
				res.send(err);
			}
			else {
				var x = artist[0].bands.length;

				if(x == 0) {
					console.log(bands.length);
					res.json(bands);
				} else {
					artist[0].bands.forEach(function(band) {
						Band.find({ _id: band }, function(err, my_bands) {
							if(err) {
								console.log(err);
								res.send(err);
							} else {
								bands.push(bands[0]);
							}

							if(x == 1) {
								console.log(bands);
								res.json(bands);
							} else 
								--x;
						});
					});
				}
			}
		});
	});

	app.get("/band/add/artist", function(req, res) {											//cadd artist to band
																								// params "band_id", "id" of artist 
		Band.find({ _id: req.query.band_id }, function(err, docs) {
			if(err)
				res.send(err);
			else {
				if(docs[0].members.indexOf(req.query.id > - 1)) {
					console.log("already added");
					res.json("alread added");
				}
				docs[0].members.push(req.query.id);
				docs[0].save(function(err) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						Artist.find({_id: req.query.id}, function(err, artist) {
							if(err)
								res.send(err);
							else {
								artist[0].bands.push(req.query.band_id);
								artist[0].save(function(err) {
									if(err) {
										console.log(err);
										res.send(err);
									} else {
										console.log("added");
										res.json("added");
									}
								});
							}
						});
					}
				});
			}
		});
	});

	app.get("/artists/name", function(req, res) {                									//  funciton to search for artist
		var user = {}; 																				//params --- "name", "cur_id"						
		var users = [];

		Artist.find({name: {"$regex": req.query.name, "$options": "i"}, _id: {'$ne': req.query.cur_id}}, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs.length == 0) {
					console.log("No artist");
					res.send(users);
					} else {
						var x =  docs.length;
						docs.forEach(function(doc) {
							user._id = doc._id;
					        user.name = doc.name;
					        user.type = "artist";
					        user.pic = doc.pic;
					        user.genre = doc.genre;

					        users.push(user);
					        if( x == 1) {
					        	console.log("sent all");
					        	res.json(users);
					        } else
					           --x;
						});
				}
			}
		});
	});

	app.post("/update", function(req, res) {										//updating or saving the other links
																					//once the user signed up
		User.find({_id: req.query.id}, function(err, docs) {
			if(err) {
				console.log(err);
				res.json(err);
			} else {
				if(req.query.type == "utube") 
					docs[0].utube = req.query.link;
				else if(req.query.type == "fbpage")
					docs[0].fbpage = req.query.link;
				else if(req.query.type == "scloud") 
					docs[0].scloud = req.query.link;
				else if(req.query.type == "instagram")
					docs[0].instagram = req.query.link;

				docs[0].save(function(err) {
					if(err)  {
						console.log(err);
						res.send(err);
					} else {
						console.log("done");
						res.json("saved");
					}
				});
			}
		});
	});

	app.get("/location", function(req, res) {												//getting the location of an user

		var location = new Location();

		Location.find({ user_id: req.query.id }, function(err, docs) {							//param is the user id
			if(err) {
				console.log(err);
				res.send(err);
			} else if(docs.length == 0) {
				console.log("not created location");
				res.send(location);
			} else {
				location = docs[0];
				console.log(location);
				res.send(location);
			}
		});
	});

	app.post("/update/location", function(req, res) {												//periodic update location funciton
																									// calls multiple time for frequent update
		Location.find({ user_id: req.query.id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log(docs[0]);
				if(docs[0].length != 0) {
					docs[0].coords.push(req.query.longitude);
					docs[0].coords.push(req.query.latitude);	
					docs[0].track = "yes";										// params are lat, long and user_id

					docs[0].save(function(err) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							console.log(docs[0]);
							res.send("updated");
						}
					});
				}
			}
		});

	});

	app.post('/stop/tracking', function(req, res) {
		Location.find({user_id: req.query.id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				docs[0].track = "no";
				docs[0].save(function(err) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						console.log(docs[0]);
						res.send("stopped");
					}
				});
			}
		});
	});

	app.get("/nearby", function(req, res) {

		var maxDistance = 80;                               ///max distance to search users from 
		maxDistance /= 6371; 

		var artists = [];                              /// divided by earth radius

		var coords = [];
		coords[0] = req.query.longitude;                    // params are lat and long of current user
		coords[1] = req.query.latitude;

		Location.find({ coords : { $near: coords, $maxDistance: maxDistance}}).limit(50).exec(function(err, locations) {						//get the ids of nearby users
																																			//limiting retieved user numbers to 10, can be changed
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log("found" + locations.length + "locations nearby");
				var length = locations.length;
				if(length != 0) {
					locations.forEach(function(location) {
						Artist.find({_id: location.user_id}, function(err, docs) {
							if(err) {
								console.log(err);
								res.json(err);
							} else {
								if(docs.length != 0) {
									var dis = geolib.getDistance({latitude: coords[1], longitude: coords[0]}, {latitude:location.coords[1], longitude: location.coords[0]});
									docs[0].dis = dis;
									artists.push(docs[0]); 
								}
							}

							if(length == 1) {
								console.log(artists);
								res.json(artists) 
							} else 
								--length;
						});
					});
				} else {
					console.log("no locations");
					res.json(artists);
				}
			}
		});
	});

	app.get("/unread", function(req, res) {										// getting chat details of
		var unread = 0;		
		
		console.log("id"+ req.query.id);

		Conversation.find({}, function(err, docs) {
			if(docs.length != 0) {

				var z = docs.length;

				docs.forEach(function(doc) {		
					if(doc.messages.length != 0) {
						doc.messages.forEach(function(err, message) {
							if(message.read == "no") 
								++unread;
						});
					}
					if(z == 1) {
						console.log(unread);
						res.json(unread);
					}
				});
			} else {
				console.log("0");
				res.json(unread);
			}
		});
	});

	app.get("/chat_details", function(req, res) {										// getting chat details of
		var con = {};																	//number of users chatted with
		var cons = [];

		var unread = 0;		
		
		console.log("id"+ req.query.id);

		Conversation.find({}, function(err, docs) {
			if(docs.length != 0) {

				var z = docs.length;

				docs.forEach(function(doc) {
					unread = 0;

					if(doc.users.indexOf(req.query.id) == 1) 
						con.id = doc.users[0];
					else if(doc.users.indexOf(req.query.id) == 0)
						con.id = doc.users[1];

					User.find({_id: con.id}, function(err, users) {
						if(err) {
							console.log("error fetching user");
							res.send(err);
						} else {
							con.unread = unread;
							con.pic = "";
							con.name = "";						///users[0].name;

							if(doc.messages.length != 0) {
								doc.messages.forEach(function(err, message) {
									if(message.read == "no") {
										++unread;
										message.read = "yes";

										doc.save(function(err) {
											if(err) 
												res.send(err);
											else {
												con.unread = unread;
											}
										});
									}
								});
							}

							console.log(con);
							cons.push(con);
							if(z == 1) {
								console.log(cons[0]);
								res.json(cons);
							}
							else
								--z;
						}
					});
				});
			} else {
				res.json(cons);
			}
		});
	});

	app.get("/conversation/id", function(req, res) {								// get the chat history of single
																     			//user with the curent user
		var message = {};														//params-- cur_id, id
		var messages = [];

		Conversation.find({}, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				var x = docs.length;
				if(x == 0)
					res.json(messages);

				docs.forEach(function(doc) {
					if(doc.users.indexOf(req.query.id) > -1 && doc.users.indexOf(req.query.cur_id) > -1) {
						messages = doc.messages;
						res.json(messages);
					}
				});
			}
		});
	});

	app.post("/message", function(req, res) {
		var message = req.body;
		message.read = req.query.read;

		Conversation.find({}, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs.length != 0) {
					docs.forEach(function(doc) {
						if(doc.users.indexOf(message.frm) > -1 && doc.users.indexOf(message.to) > -1) {
							doc.messages.push(message);
							doc.save(function(err) {
								if(err) {
									console.log(err);
									res.send(err);
								} else {
									res.json("saved");
								}
							});
						}
					});

					var Conversation = new Conversation();
					conversation.users.push(message.frm);
					conversation.users.push(message.to);
					conversation.messages.push(message);

					conversation.save(function(err) {
						if(err)
							res.send(err);
						else {
							console.log("saved");
							res.json("saved");
						}
					});
				} else {
					var Conversation = new Conversation();
					conversation.users.push(message.frm);
					conversation.users.push(message.to);
					conversation.messages.push(message);

					conversation.save(function(err) {
						if(err)
							res.send(err);
						else {
							console.log("saved");
							res.json("saved");
						}
					});
				}
			}
		});
	});

	app.get('/followOrNot', function(req, res) {
		User.find({ _id: req.query.cur_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs[0].following.indexOf(req.query.id) > -1) {
					console.log("yes folllow");
					res.json("yes");
				} else {
					console.log("no follow");
					res.json("no");
				}
			}
		});
	});

	app.get('/all/artists', function(req, res) {
		var artists = [];
		var i;

		Artist.find({}, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs.length != 0) {
					var x = docs.length;
					docs.forEach(function(doc) {

						doc.dis = "";
						if(doc._id != req.query.id)
							artists.push(doc);

						if(x == 1) {
							console.log("artist sent", artists.length);
							console.log(artists[0]);
							res.json(artists);
						}
						else
							--x;
					});
				}
				else {
					console.log("no found any");
					res.json(artists);
				}
			}
		});  
	});

	app.post('/update/artist', function(req, res) {
		Artist.findByIdAndUpdate(req.body._id, req.body, {new: true}, function(err, user) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log(user);
				res.send("updated");
			}
		});
	});

	app.post('/update/venue', function(req, res) {
		Venue.findByIdAndUpdate(req.body._id, req.body, {new: true}, function(err, user) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log(user);
				res.send("upated");
			}
		});
	});

	app.post('/update/band', function(req, res) {
		Band.findByIdAndUpdate(req.body._id, req.body, {new: true}, function(err, user) {
			if(err) {
				console.log(err);
				res.json(err);
			} else {
				var x = doc.members.length;
				doc.members.forEach(function(member) {
					Artist.find({_id: member}, function(err, docs) {
						if(err) {
							console.log(err);
							res.json(err);
						} else {
							if(docs[0].bands.indexOf(user._id) == -1) {
								docs[0].bands.push(user._id);
								docs[0].save(function(err) {
									if(err) {
										console.log(err);
										res.json(err);
									}
								});
							} 
						}
						if(x == 1) {
							console.log("updated");
							res.json("updated");
						} else
							--x;
					});
				});
			}
		});
	});

	app.get("/followers", function(req, res) {

		var follower = {};
		var followers = [];

		User.find({ _id: req.query.cur_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				var x = docs[0].followers.length;

				docs[0].followers.forEach(function(doc) {
					User.find({ _id: doc }, function(err, users) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							follower.id = doc;
							follower.name = users[0].name;
							follower.type = users[0].type;
							if(users[0].__t == "Artist" || users[0].__t == "Band") 
								follower.genre = users[0].genre;
							else
								follower.genre = "";
							follower.pic = users[0].pic;

							followers.push(follower);
						}

						if(x == 1) {
							console.log(followers);
							res.json(followers);
						} else {
							--x
						}
					});
				});
			}
		});
	});

	app.get("/following", function(req, res) {

		var following = {};
		var followings = [];

		User.find({ _id: req.query.cur_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				var x = docs[0].following.length;

				docs[0].following.forEach(function(doc) {
					User.find({ _id: doc }, function(err, users) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							following.id = doc;
							following.name = users[0].name;
							following.type = users[0].type;
							if(users[0].__t == "Artist" || users[0].__t == "band") 
								following.genre = users[0].genre;
							else
								following.genre = "";
							following.pic = users[0].pic;

							followings.push(following);
						}

						if(x == 1) {
							console.log(followings);
							res.json(followings);
						} else {
							--x
						}
					});
				});
			}
		});
	});

	app.post("/book/artist", function(req, res) {
		var booking = new Booking();
		var bookingNotify = new Notification();

		Artist.find({ _id: req.query.artist_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				booking.type = docs[0].type;
				booking.booked_id = docs[0]._id;
				booking.booked = doc[0].name;
				booking.bookedBy_id = req.query.venue_id;
				booking.time = req.query.time;
				booking.day = req.query.day;
				booking.status = "sent";

				Venue.find({ _id: req.query.venue_id }, function(err, venues) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						console.log("booked");
						booking.bookedBy = venues[0].name;
						booking.save(function(err) {
							if(err) {
								console.log(err);
								res.send(err);
							} else {
								bookingNotify.details = venues[0].name  + " have invited you to perform on " + 
																	booking.date + " at " + bookingtime;
								bookingNotify.pic = venues[0].pic;
								bookingNotify.option = "yes";
								bookingNotify.seen = "no";
								bookingNotify.type = "booking";
								bookingNotify.attached_id = booking._id;

								bookingNotify.save(function(err) {
									if(err) {
										console.log(err);
										res.send(err)
									} else {
										console.log(booking);

										docs[0].notifications.unshift(bookingNotify._id);
										docs[0].save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												console.log("booked");
												var message = {
												    to: docs[0].gcm_token, // required
												    notification: {
												        title: 'New Booking',
												        body: bookingNotify.details
												    }
												};

												fcm.send(message, function(err, response){
												    if (err) {
												        console.log("Something has gone wrong!");
												    } else {
												        console.log("Successfully sent with response: ", response);
														res.json("sent");
												    }
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	});

	app.post("/book/band", function(req, res) {
		var booking = new Booking();
		var bookingNotify = new Notification();

		booking.booked_id = req.query.band_id;
		booking.bookedBy_id = req.query.venue_id;
		booking.type = "Band";
		booking.date = req.query.date;
		booking.time = req.query.time;
		booking.status = "sent";

		Band.find({ _id: req.query.band_id }, function(err, bands) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				booking.booked = bands[0].name;
				Venue.find({ _id: req.query.venue_id }, function(err, venues) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
							booking.bookedBy = venues[0].name;
							booking.save(function(err) {
								bookingNotify.details = venues[0].name + " have invited your band" + bands[0].name + "to perform on " 
															+ booking.date + " at " + booking.time;
								bookingNotify.pic = venues[0].pic;
								bookingNotify.seen = "no";
								bookingNotify.option = "yes";
								bookingNotify.type = "booking";
								bookingNotify.attached_id = booking._id;

								bookingNotify.save(function(err) {
									if(err) {
										console.log(err);
										res.send(err);
									} else {
										Artist({ _id: bands[0].manager_id }, function(err, manager) {
											if(err) {
												console.log(err);
												res.send(err); 
											} else {
												manager[0].notifications.unshift(bookingNotify._id);
												manager[0].save(function(err) {
													if(err) {
														console.log(err);
														res.send(res);
													} else {
														console.log("booking sent");
														var message = {
														    to: manager[0].gcm_token, // required
														    notification: {
														        title: 'New Booking',
														        body: bookingNotify.details
														    }
														};

														fcm.send(message, function(err, response){
														    if (err) {
														        console.log("Something has gone wrong!");
														    } else {
														        console.log("Successfully sent with response: ", response);
																res.json("sent");
														    }
														});
													}
												});
											}
										});
									}
								});
						});
					}
				});
			}
		});
	});

	app.get("/booking/details/artist", function(req, res) {
		var bookings = [];

		Booking.find({ booked_id: req.query.id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Array.prototype.push.apply(bookings, docs);
				Artist.find({ _id: req.query.id }, function(err, users) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						var x = users[0].bands.length;

						users[0].bands.forEach(function(band) {
							Booking.find({ booked: band }, function(err, all) {
								if(err) {
									console.log(err);
									re.send(err);
								} else {
									Array.prototype.push.apply(bookings, all);
								}

								if(x == 1) {
									console.log(bookings);
									res.json(bookings);
								} else 
									--x;
							});
						});
					}
				});
			}
		});
	});

	app.get("/booking/details/venue", function(req, res) {
		var bookings = [];

		Booking.find({ bookedBy_id: req.query.id }, function(err, docs) {
			if(err) {

				console.log(err);
				res.send(err);
			} else {
				Array.prototype.push.apply(bookings, docs);
				console.log(bookings);
				res.json(bookings);
			}
		});
	});

	app.post("/jam/send", function(req, res) {
		var jammingNotify = new Notification();
		var jammming = new Jamming();

		Artist.find({ _id: req.query.sender_id }, function(err, docs) {
			jamming.sender_id = docs[0]._id;
			jamming.sender  = docs[0].name;
			jamming.date = req.query.date;
			jamming.time = req.query.time;

			Artist.find({ _id: req.query.sent_to_id }, function(err, artists) {
				if(err) {
					console.log(err);
					res.send(err);
				} else {
					jamming.sent_to_id = artists[0]._id;
					jamming.sent_to = artists[0].name;
					
					jamming.save(function(err) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							jammingNotify.details = jamming.sender + " has asked to jam with him on " + jamming.day + " at "
							 																+ jamming.time;
							jammingNotify.pic = docs[0].pic;
							jammingNotify.option = "yes"; 
							jammingNotify.type = "jamming";
							jammingNotify.seen = "no";
							jammingNotify._id = jamming._id;

							jammingNotify.save(function(err) {
								if(err) {
									console.log(err);
									res.send(err);
								} else {
									artists[0].notifications.unshift(jammingNotify._id);
									artists[0].save(function(err) {
										if(err) {
											console.log(err);
											res.send(err);
										} else {
											console.log("send notification for jammming");
											
											var message = {
												    to: artists[0].gcm_token, // required
												    notification: {
												        title: 'New Jam request',
												        body: jammingNotify.details,
												        click_action: 'OPEN_ACTIVITY_1'
												    }
												};

												fcm.send(message, function(err, response){
												    if (err) {
												        console.log("Something has gone wrong!");
												    } else {
												        console.log("Successfully sent with response: ", response);
														res.json("sent");
												    }
												});
										}
									});
								}
							});
						}
					});
				}
			});
		});
	});

	app.post("/jam/accepted", function(req, res) {

		Notification.find({ _id: notify_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Jamming.find({ _id: docs[0].attached_id }, function(err, jams) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						if(jams.length == 0) {
							console.log("no_jams");
							res.json("no_jam_found");
						} else {
							jams[0].status = "accepted";
							jams[0].save(function(err) {
								Artist.find({ _id: jams[0].sent_to_id }, function(err, artists) {
									if(err) {
										console.log(err);
										res.send(err); 
									} else {
										artists[0].splice(artists[0].notifications.indexOf(docs[0]._id), 1);
										artists.save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												Artist.find({ _id: jams[0].sender_id }, function(err, result) {
													if(err) {
														console.log(err);
														res.send(err);
													} else {
														var acceptNotify = new Notification();
														acceptNotify.details = jams[0].sent_to + " have accepted your jamming requested.";
														acceptNotify.pic = artists[0].pic;
														acceptNotify.type = "jamming";
														acceptNotify.option = "no";
														acceptNotify.seen = "no";

														acceptNotify.save(function(err) {
															if(err) {
																console.log(err);
																res.send(err);
															} else {
																result[0].notifications.unshift(acceptNotify);
																result[0].save(function(err) {
																	if(err) {
																		console.log(err);
																		res.send(err);
																	} else {
																		console.log("accepted");
																		
																		var message = {
																		    to: result[0].gcm_token, // required
																		    notification: {
																		        title: 'Jam request accepted',
																		        body: acceptNotify.details,
																		        click_action: 'OPEN_ACTIVITY_1'
																		    }
																		};

																		fcm.send(message, function(err, response){
																		    if (err) {
																		        console.log("Something has gone wrong!");
																		        res.send(err)
																		    } else {
																		        console.log("Successfully sent with response: ", response);
																				res.json("jam_accepted");
																		    }
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
							});
						}
					}
				});
			}
		});
	});

	app.post("/jam/rejected", function(req, res) {

			Notification.find({ _id: req.query.notify_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Jamming.find({ _id: docs[0].attached_id }, function(err, jams) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						if(jams.length == 0) {
							console.log("no_jams");
							res.json("no_jam_found");
						} else {
								Artist.find({ _id: jams[0].sent_to_id }, function(err, artists) {
									if(err) {
										console.log(err);
										res.send(err); 
									} else {
										artists[0].splice(artists[0].notifications.indexOf(docs[0]._id), 1);
										artists.save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												Artist.find({ _id: jams[0].sender_id }, function(err, result) {
													if(err) {
														console.log(err);
														res.send(err);
													} else {
														var rejectNotify = new Notification();
														rejectNotify.details = jams[0].sent_to + " could not jam with you.";
														rejectNotify.pic = artists[0].pic;
														rejectNotify.type = "jamming";
														rejectNotify.option = "no";
														rejectNotify.seen = "no";

														rejectNotify.save(function(err) {
															if(err) {
																console.log(err);
																res.send(err);
															} else {
																result[0].notifications.unshift(rejectNotify);
																result[0].save(function(err) {
																	if(err) {
																		console.log(err);
																		res.send(err);
																	} else {
																		console.log("rejected");
																		jams[0].remove(function(err) {
																			if(err) {
																				console.log(err);
																				res.send(err);
																			} else {
																				console.log("removed_jam");
																				var message = {
																				    to: result[0].gcm_token, // required
																				    notification: {
																				        title: 'Jam request rejected',
																				        body: rejectNotify.details,
																				        click_action: 'OPEN_ACTIVITY_1'
																				    }
																				};

																				fcm.send(message, function(err, response){
																				    if (err) {
																				        console.log("Something has gone wrong!");
																				        res.send(err)
																				    } else {
																				        console.log("Successfully sent with response: ", response);
																						res.json("jam_rejected");
																				    }
																				});
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
						}
					}
				});
			}
		});
	});

	app.post("/jam/cancel", function(req, res) {
		Jamming.find({ sender_id: req.query.sender_id, sent_to_id: req.query.sent_to_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Artist.find({ _id: req.query.sent_to_id }, function(err, artists) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						var cancelNotfiy = new Notification();
						cancelNotfiy.details = docs[0].sender + " have canceled the jam on " + docs[0].date + " at " + docs[0].time;
						Artist.find({_id: req.query.sender_id}, function(err, result) {
							if(err) {
								console.log(err);
								res.send(err);
							} else {
								cancelNotfiy.pic = result[0].pic;
								cancelNotfiy.type = "jamming";
								cancelNotfiy.option = "no";
								cancelNotfiy.seen = "no";

								cancelNotfiy.save(function(err) {
									if(err) {
										console.log(err);
										res.send(err);
									} else {
										docs[0].remove(function(err) {
											if(err) {
												console.log(err);
												res.json(err);
											} else {
												var message = {
												    to: artists[0].gcm_token, // required
												    notification: {
												        title: 'Jam request canceled',
												        body: cancelNotfiy.details,
												        click_action: 'OPEN_ACTIVITY_1'
												    }
												};

												fcm.send(message, function(err, response){
												    if (err) {
												        console.log("Something has gone wrong!");
												        res.send(err)
												    } else {
												        console.log("Successfully sent with response: ", response);
														res.json("jam_cancel");
												    }
												});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	});

		app.post("/booking/accepted", function(req, res) {

		Notification.find({ _id: req.query.notify_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Booking.find({ _id: docs[0].attached_id }, function(err, books) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						if(books.length == 0) {
							console.log("no_books");
							res.json("no_booking_found");
						} else {
							books[0].status = "accepted";
							books[0].save(function(err) {
								var search_id;

								if(books[0].type != "Bands")
									search_id = books[0].booked_id;
								else {
									Band.find({ _id: books[0].booked_id }, function(err, band) {
										if(err) {
											console.log(err);
											res.send(err); 
										} else {
											search_id = band[0].manager_id;
										}
									});
								}

								Artist.find({ _id: search_id }, function(err, artists) {
									if(err) {
										console.log(err);
										res.send(err); 
									} else {
										artists[0].splice(artists[0].notifications.indexOf(docs[0]._id), 1);
										artists.save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												Venue.find({ _id: books[0].bookedBy_id }, function(err, result) {
													if(err) {
														console.log(err);
														res.send(err);
													} else {
														var acceptNotify = new Notification();
														acceptNotify.details = books[0].booked + " has been booked " + " on " + books[0].date + " at " + books[0].time;
														acceptNotify.pic = docs[0].pic;
														acceptNotify.type = "booking";
														acceptNotify.option = "no";
														acceptNotify.seen = "no";

														acceptNotify.save(function(err) {
															if(err) {
																console.log(err);
																res.send(err);
															} else {
																result[0].notifications.unshift(acceptNotify);
																result[0].save(function(err) {
																	if(err) {
																		console.log(err);
																		res.send(err);
																	} else {
																		console.log("accepted");
																		var message = {
																		    to: result[0].gcm_token, // required
																		    notification: {
																		        title: 'Booking request accepted',
																		        body: acceptNotify.details,
																		        click_action: 'OPEN_ACTIVITY_1'
																		    }
																		};

																		fcm.send(message, function(err, response){
																		    if (err) {
																		        console.log("Something has gone wrong!");
																		        res.send(err)
																		    } else {
																		        console.log("Successfully sent with response: ", response);
																				res.json("booking_accepted");
																		    }
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
							});
						}
					}
				});
			}
		});
	});

	app.post("/booking/rejected", function(req, res) {

			Notification.find({ _id: req.query.notify_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				Booking.find({ _id: docs[0].attached_id }, function(err, books) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						if(books.length == 0) {
							console.log("no_bookings");
							res.json("no_booking_found");
						} else {

								var search_id;

								if(books[0].type != "Bands")
									search_id = books[0].booked_id;
								else {
									Band.find({ _id: books[0].booked_id }, function(err, band) {
										if(err) {
											console.log(err);
											res.send(err); 
										} else {
											search_id = band[0].manager_id;
										}
									});
								}

								Artist.find({ _id: search_id }, function(err, artists) {
									if(err) {
										console.log(err);
										res.send(err); 
									} else {
										artists[0].splice(artists[0].notifications.indexOf(docs[0]), 1);
										artists.save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												Venue.find({ _id: books[0].bookedBy_id }, function(err, result) {
													if(err) {
														console.log(err);
														res.send(err);
													} else {
														var rejectNotify = new Notification();
														rejectNotify.details = books[0].booked + " could not perform here.";
														rejectNotify.pic = docs[0].pic;
														rejectNotify.type = "booking";
														rejectNotify.option = "no";
														rejectNotify.seen = "no";

														rejectNotify.save(function(err) {
															if(err) {
																console.log(err);
																res.send(err);
															} else {
																result[0].notifications.unshift(rejectNotify._id);
																result[0].save(function(err) {
																	if(err) {
																		console.log(err);
																		res.send(err);
																	} else {
																		console.log("rejected");
																		books[0].remove(function(err) {
																			if(err) {
																				console.log(err);
																				res.send(err);
																			} else {
																				console.log("removed_jam");
																				var message = {
																				    to: result[0].gcm_token, // required
																				    notification: {
																				        title: 'Jam request rejected',
																				        body: rejectNotify.details,
																				        click_action: 'OPEN_ACTIVITY_1'
																				    }
																				};

																				fcm.send(message, function(err, response){
																				    if (err) {
																				        console.log("Something has gone wrong!");
																				        res.send(err)
																				    } else {
																				        console.log("Successfully sent with response: ", response);
																						res.json("booking_rejected");
																				    }
																				});
																				
																			}
																		});
																	}
																});
															}
														});
													}
												});
											}
										});
									}
								});
						}
					}
				});
			}
		});
	});

	app.post("booking/cancel", function(req, res) {
		booking.find({ booked_id: req.query.booked_id, bookedBy_id: req.query.bookedBy_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				var search_id;

				if(docs[0].type != "Bands")
					search_id = docs[0].booked_id;
				else {
					Band.find({ _id: docs[0].booked_id }, function(err, band) {
						if(err) {
							console.log(err);
							res.send(err); 
						} else {
							search_id = band[0].manager_id;
						}
					});
				}

				Artist.find({ _id: search_id }, function(err, artists) {
					if(err) {
						console.log(err);
						res.send(err);
					} else {
						var cancelNotfiy = new Notification();
						cancelNotfiy.details = docs[0].bookedBy + " have canceled the booking request on " + docs[0].date + " at " + docs[0].time;

						Venue.find({ _id: req.query.bookedBy_id }, function(err, result) {
							if(err) {
								console.log(err);
								res.send(err);
							} else {
								cancelNotfiy.pic = result[0].pic;
								cancelNotfiy.type = "booking";
								cancelNotfiy.option = "no";
								cancelNotfiy.seen = "no";

								cancelNotfiy.save(function(err) {
									if(err) {
										console.log(err);
										res.send(err);
									} else {
										docs[0].remove(function(err) {
											if(err) {
												console.log(err);
												res.json(err);
											} else {
													artists[0].notifications.unshift(cancelNotfiy._id);
													var message = {
													    to: artists[0].gcm_token, // required
													    notification: {
													        title: 'Booking request canceled',
													        body: cancelNotfiy.details,
													        click_action: 'OPEN_ACTIVITY_1'
													    }
													};

													fcm.send(message, function(err, response){
													    if (err) {
													        console.log("Something has gone wrong!");
													        res.send(err)
													    } else {
													        console.log("Successfully sent with response: ", response);
															res.json("booking_cancel");
													    }
													});
											}
										});
									}
								});
							}
						});
					}
				});
			}
		});
	});

	app.post("/update/gcm", function(req, res) {
		User.find({ _id: req.query.id }, function(err, users) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(users.length != 0) {
					users[0].gcm_token = req.query.gcm_token;
					users[0].save(function(err) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							console.log("saved_gcm");
							res.json("updated_gcm");
						}
					});
				} else
					res.json("update_gcm");
			}
		});
	});

	app.get("/bookedOrNot", function(req, res) {
		Booking.find({ bookedBy_id: req.query.cur_id , booked_id: req.query.id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs.length == 0) {
					console.log("no booking");
					res.json("Book");
				} else {
					if(docs[0].status == "sent") {
						console.log("cancel");
						res.json("Cancel");
					} else if(docs[0].status == "accepted") {
						console.log("Booked");
						res.json("Booked");
					}
				}
			}
		});
	});

	app.get("/jammingOrNot", function(req, res) {
		Jamming.find({ sender_id: req.query.cur_id, sent_to_id: req.query.id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				if(docs.length == 0) {
					console.log("no jamming");
					res.json("Jam");
				} else {
					if(docs[0].status == "sent") {
						console.log("cancel");
						res.json("Cancel");
					} else if(docs[0].status == "accepted") {
						console.log("jamming");
						res.json("Jamming");
					}
				}
			}
		});
	});

	app.get("/notifications", function(req, res) {
		var notifications = [];

		User.find({ _id: req.query.id}, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
			
				var x = docs[0].notifications.length;
				if(x == 0) {
					console.log(x);
					res.send(notifications);
				} else {
						docs[0].notifications.forEach(function(id) {
							Notification.find({ _id: id }, function(err, notification) {
								if(err) {
									console.log(err);
									res,send(err);
								} else {
										notification[0].seen = "yes";
										notification[0].save(function(err) {
											if(err) {
												console.log(err);
												res.send(err);
											} else {
												notifications.push(notification[0]);
												if(x == 1) {
													console.log(notification[0]);
													res.send(notifications);
												} else 
													--x;
											}
										});
									}
							});
						});
					}
			}
		});
	});

	app.get("/band/members", function(req, res){
		var artists = [];

		Band.find({_id: req.query.id}, function(err, bands) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				var x = bands[0].members.length;
				bands[0].members.forEach(function(member) {
					Artist.find({_id: member}, function(err, artist) {
						if(err) {
							console.log(err);
							res.send(err);
						} else {
							artist[0].dis = bands[0].positions[bands[0].members.indexOf(artist[0]._id)];
							artists.push(artist[0]);
						}

						if(x = 1) {
							console.log(artists);
							res.json(artists);
						} else
							--x;
					});
				});
			}
		});
	});

	app.get("/bands/city", function(req, res){
		Band.find({ location: req.query.city }, function(err, bands) {
			console.log("calling");
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log("got it");
				res.json(bands);
			}
		});
	});
}
