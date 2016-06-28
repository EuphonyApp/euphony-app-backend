var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PendingMessageSchema = new Schema({
	message: String,
	to: String,
	frm: String
});

module.exports = mongoose.model('PendingMessage', PendingMessageSchema);