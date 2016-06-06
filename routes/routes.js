var util = require('util');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

function UserSchema() {
	Schema.apply(this, arguments);

	this.add({
		name: String,
		type: String,
		location:String,
		f_id: String,
		g_id: String,
		pic: String,
		following: [String]
	});
};

util.inherits(UserSchema, Schema);

var ArtistSchema = new UserSchema({
	email: String,
	genre: String,
	subGenre: String,
	fbPage: String,
	utube: String,
	followers: [String]
});

var VenueSchema = new UserSchema({
	email: String
});

var BandSchema = new UserSchema({
	memebers: [String],
	followers: [String]
});

var User = mongoose.model('User', new UserSchema());
var Artist = User.discriminator('Artist',  ArtistSchema);
var Venue = User.discriminator('Venue', VenueSchema);
var Band = User.discriminator('Band', BandSchema);

module.exports = function(app) {
	app.get('/id', function(req, res) {
		if(req.query.f_id != "no") {
			User.find({ f_id: req.query.f_id}, function(err, docs) {
				if(err)
					res.end(err);
				else if(docs.length != 0) {
					console.log(req.query.f_id + " " + docs[0]._id);
					res.json(docs[0]._id + " " + docs[0].type); 
				} else if(docs.length == 0) {
					console.log(req.query.f_id + " not found");
					res.json("null");
				}
			});
		} else if(req.query.g_id != "no") {
			User.find({ g_id: req.query.g_id }, function(req, res) {
				if(err)
					res.end(err);
				else if(docs.length != 0) {
					console.log(req.query.g_id + " " + docs[0]._id);
					res.json(docs[0]._id + " " + docs[0].type);
				} else if(docs.length == 0) {
					console.log(req.query.g_id + " not fond");
					res.json("null");
				}
			});
		}
	});

	app.get('/user/all', function(req, res) {
		var user = {};
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

					if(doc.type == "bands")
						user.members = doc.members.length;
					else
						user.members = 0;

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

	app.get('/user/ids', function(req, res) {
		var items = req.query.ids;
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

				if(docs[0].type != venue) {
					if(docs[0]._id == req.query.cur_id) 
						user.followOrno = "";
					else if(docs[0].followers.indexOf(req.query.cur_id) > -1) 
						user.followOrno = "yes"; 
					else
						user.followOrno = "no";
					users.push(user);
				} else {
					user.followOrno = "";
					users.push(user);
				}

				if(x == 1)
					res.json(users);
				else
					--x;
			});
		});
	});

	app.post('/follow', function(req, res) {
		User.find({ _id: req.query.follow }, function(err, docs) {
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

	app.post('/unfollow', function(req, res) {
		User.find({ _id: req.query.unfollow }, function(err, docs) {
			if(err) {
				console.log("unfollow error"  + err);
				res.end(err);
			}

			var index = docs[0].followers.indexOf(req.query.cur_user);

			if(index > -1) {
				docs[0].followers.splice(x, 1);
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
					var index = users[0].followers.indexOf(req.query.unfollow);

					if(index > -1) {
						docs[0].followers.splice(x, 1);
						docs[0].save(function(err) {
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

	app.post('/artist', function(req, res) {
		var artist = new Artist(req.body);

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

	app.get('/artist', function(req, res) {
		Artist.find({ _id: req.query.id }, function(err, artists) {
			if(err) {
				console.log("error while sending artist");
				res.end(err);
			} else {
				var artist = artists[0];
				console.log("SEnt" + artist);
				res.json(artist);
			}
		});
	});

	app.post('/artists', function(req, res) {
		var items = req.body;
		var x = items.length;

		items.forEach(function(item) {
			x
			var artist = new Artist(item);
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
	
}
