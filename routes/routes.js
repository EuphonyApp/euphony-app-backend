var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ArtistSchema = new mongoose.Schema({
	name: String,
	email: String,
	f_id: String,
	g_id: String,
	type:String,
	location: String,
	genre: String,
	subGenre: String,
	fbPage: String,
	utube: String,
	pic: String
});

var Artist = mongoose.model('Artist', ArtistSchema);

module.exports = function(app) {
	app.get('/', function(req, res) {
		res.end("Node android project.");
	});

	app.post('/artist', function(req, res) {
		var artist = new Artist();

		artist.name = req.body.name;
		artist.email = req.body.email;
		artist.f_id = req.body.f_id;
		artist.g_id = req.body.g_id;
		artist.type = req.body.type;
		artist.location = req.body.location;
		artist.genre = req.body.genre;
		artist.subGenre = req.body.subGenre;
		artist.fbPage = req.body.fbPage;
		artist.utube = req.body.utube;
		artist.pic = req.body.pic;

		artist.save(function(artist, err) {
			if(err)
				res.send(err);
			else {
				console.log("Artist created");
				res.json({ message: "Artist registered" });
			}
		});
	});

	app.get('/artist', function(req, res) {
		var a = {};
		a.name = "a";
		a.email = " ";
		a.f_id = " ";
		a.g_id = " ";
		a.type = " ";
		a.location = " ";
		a.genre = " ";
		a.subGenre = " ";
		a.fbPage = " ";
		a.utube = " ";
		a.pic = " ";

		console.log(req.query.f_id);

		if(req.query.f_id != "NO") {
			Artist.find({ 'f_id': req.query.f_id }, function(err, artists) {

				if(err) {
					console.log(err);
					if(artists == null) {
						console.log("here");
						res.json(a);
					}
					else {
						console.log("not here");
						res.send(err);
					}
				}

				else if(artists.length == 0){
					console.log("NO Artist from fb");
					res.json(a);
				}

				else if(artists.length != 0) {
					var artist = {};

					artist.name = artists[0].name;
					artist.email = artists[0].email;
					artist.f_id = artists[0].f_id;
					artist.g_id = artists[0].g_id;
					artist.type = artists[0].type;
					artist.location = artists[0].location;
					artist.genre = artists[0].genre;
					artist.subGenre = artists[0].subGenre;
					artist.fbPage = artists[0].fbPage;
					artist.utube = artists[0].utube;
					artist.pic = artists[0].pic;

					console.log("Sent artist from fb" + artist.name);
					res.json(artist);
				}
			});
		} else if(req.query.g_id != "NO") {
			Artist.find({ 'g_id': req.query.g_id }, function(err, artists) {

				if(err) {
					console.log(err);
					if(artists == null) {
						res.json(a);
					}
					else {
						res.send(err);
					}
				}

                else if(artists.length == 0) {
					console.log("NO Artist from g+");
					res.json(a);
				}
				else if(artists.length != 0) {
					var artist = {};

					artist.name = artists[0].name;
					artist.email = artists[0].email;
					artist.f_id = artists[0].f_id;
					artist.g_id = artists[0].g_id;
					artist.type = artists[0].type;
					artist.location = artists[0].location;
					artist.genre = artists[0].genre;
					artist.subGenre = artists[0].subGenre;
					artist.fbPage = artists[0].fbPage;
					artist.utube = artists[0].utube;
					artist.pic = artists[0].pic;

					console.log("Sent artist from g+" + artist);
					res.json(artist);
				}
			});
		}
	});
};
