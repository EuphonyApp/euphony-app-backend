var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ConversationSchema = new Schema({
	messages: [{ data: String, to: String, frm: String, read: String }],
	users: [String]
});

module.exports = mongoose.model('Conversation', ConversationSchema);