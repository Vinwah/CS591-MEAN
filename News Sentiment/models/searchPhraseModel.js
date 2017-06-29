const mongoose = require('mongoose')
const config = require('../config')

//Set up ES6 Promises
mongoose.Promise = global.Promise;

//If there's already a connection, we'll just use that, otherwise connect here.
if (!mongoose.connection.db) {
    mongoose.connect(config.db.path)
}

// the schema for the collection

const searchPhrase = new mongoose.Schema({
    phrase: String,
    occurrences: Number
});

//name of collection
const searchPhraseModel = mongoose.model('searchPhrase', searchPhrase);


module.exports = searchPhraseModel