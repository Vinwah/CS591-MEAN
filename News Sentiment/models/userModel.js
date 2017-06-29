//Model used for storing users in the mongoDB

const mongoose = require('mongoose')
let config = require('../config')

//Set up ES6 Promises
mongoose.Promise = global.Promise;

//If there's already a connection, we'll just use that, otherwise connect here.
if (!mongoose.connection.db) {
    mongoose.connect(config.db.path)
}

// the schema for the collection
const user = new mongoose.Schema({
    username: String,
    name: String,
    twitterID: String
})

//name of collection
const userModel = mongoose.model('user', user);


module.exports = userModel