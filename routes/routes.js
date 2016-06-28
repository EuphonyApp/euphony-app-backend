var util = require('util');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Conversation = require('../models/conversation.js'); 

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
		followers: [String]
	});
};

util.inherits(UserSchema, Schema);

var ArtistSchema = new UserSchema({
	email: String,
	genre: String,
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
	scloud: String                  // add details
});

var LocationSchema = new Schema({
	user_id: String,
	coords: { type: [Number], index: '2d' },
	timestamp: { type: Date, default: Date.now }
});

var BookingSchema = new Schema({						// thinking of storing booking details as individual transactions in 
	booked: String,											// instead of storing in the artist, venue models
	bookedBy: String									
});

var User = mongoose.model('User', new UserSchema());
var Artist = User.discriminator('Artist',  ArtistSchema);
var Venue = User.discriminator('Venue', VenueSchema);
var Band = User.discriminator('Band', BandSchema);
var Location = mongoose.model('Location', LocationSchema);

var Booking = mongoose.model('Booking', BookingSchema);

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
					console.log(req.query.f_id + " " + docs[0]._id);
					res.json(docs[0]._id + " " + docs[0].type + " " + docs[0].location + " " + docs[0].name); 
				} else if(docs.length == 0) {
					console.log(req.query.f_id + " not found");
					res.json("null");
				}
			});
		} else if(req.query.g_id != "no") {																	// if signed in google+
			User.find({ g_id: req.query.g_id }, function(req, res) {
				if(err)
					res.end(err);
				else if(docs.length != 0) {
					console.log(req.query.g_id + " " + docs[0]._id);
					res.json(docs[0]._id + " " + docs[0].type + " " + docs[0].location + " " + docs[0].name);
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

	app.post('/follow', function(req, res) {														//function for "follow" event
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
							console.log("saving failed while following "+ err);
							res.end(err);
						} else {

							console.log("Success in following")
							res.json({ message: "Followed successfully"});
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
				res.json(artist._id);
			}
		});
	});

	app.post('/band', function(req, res) {												//create a band
		var band = new Band(req.body);													// params "band" object

		band.save(function(err) {
			if(err) {
				console.log("Error while creating band " + err);
				res.end(err);
			} else {

				Artist.find({_id: band.members[0]}, function(err, docs) {
					if(err)
						res.send(err);
					else {
						docs[0].bands.push(band._id);
						docs[0].save(function(err) {
							if(err)
								res.send(err);
							else {
								console.log("created " + band + docs[0].bands);
				        		res.json(band._id);
							}
						});
					}
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
				console.log("created venue"+ artist);
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
			artist.dis = "	";
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
		var user = {};
		var users = [];
		var ids = [];

		User.find({ _id : req.query.cur_id }, function(err, artist) {

			if(err) {
				console.log(err);
				res.send(err);
			}
			else {
				ids = artist[0].bands;
				var x = ids.length;

				console.log(ids);

				if(x == 0) {
					console.log(users.length);
					res.json(users);
				}

				ids.forEach(function(id) {

					Band.find({ _id: id }, function(err, doc) {
						if(err)
							res.send(err);
						else {

						user._id = doc[0]._id;
						user.name = doc[0].name;
						user.type = doc[0].type;
						user.pic = doc[0].pic;
						user.location = doc[0].location;
						user.members = doc[0].members.length;
						user.no_followers = doc[0].followers.length;

						if(doc[0].followers.indexOf(req.query.cur_id) > -1)
							user.followOrnot = "yes";
						else
							user.followOrnot = "no";

						users.push(user);
						if(x == 1) {
							console.log(users);
							res.json(users);
						}
					    else
							 --x;
					}
					});
				});
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
					        user.type = doc.genre;
					        user.pic = doc.pic;
					        user.followOrno = "no";

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

	app.post("/location", function(req, res) {						//create the location of user 
																	//param is the user id, lat and long
		var location = new Location(req.body);						//called only the first time, (update) location will be called afterwards
		location.timestamp = Date.now;

		location.save(function(err) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log("location created");
				res.json("created");
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
		Location.find({ user_id: req.query.user_id }, function(err, docs) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log(docs[0]);
				docs[0].timestamp = Date.now;														// show the time of update, most recent is saved
				docs[0].coords.push(req.query.longitude);
				docs[0].coords.push(req.query.latitude);											// params are lat, long and user_id

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
		});

	});

	app.get("/nearby", function(req, res) {

		var maxDistance = 30;                               ///max distance to search users from 
		maxDistance /= 6371;                               /// divided by earth radius

		var coords = [];
		coords[0] = req.query.longitude;                    // params are lat and long of current user
		coords[1] = req.query.latitude;

		Location.find({ coords : { $near: coords, $maxDistance: maxDistance}}).limit(10).exec(function(err, locations) {						//get the ids of nearby users
																																			//limiting retieved user numbers to 10, can be changed
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log("found" + locations.length + "locations nearby");
				res.send(locations);
			}
		});
	});

	app.post("/book", function(req, res) {
		/// code to book

		var booking = new Booking(req.body);
		booking.save(function(err) {
			if(err) {
				console.log(err);
				res.send(err);
			} else {
				console.log("booked");
				res.json("booked");
			}
		});
	});

	app.get("/details/bookings", function(req, res) {
		/// code to retrieve booking details of single user
		if(req.query.type == "venue") {

		} else {
			
		}
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

						doc.dis = "20km";
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
}
