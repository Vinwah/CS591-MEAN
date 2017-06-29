//Model used for storing news articles in the mongoDB

const mongoose = require('mongoose')
const config = require('../config')

//Set up ES6 Promises
mongoose.Promise = global.Promise;

//If there's already a connection, we'll just use that, otherwise connect here.
if (!mongoose.connection.db) {
    mongoose.connect(config.db.path)
}

// the schema for the collection
const newsArticle = new mongoose.Schema({
    source: String,
    author: String,
    description: String,
    publishedAt: Date,
    title: String,
    url: String,
    urlToImage: String,
    ratings: Array
});

//name of collection
const newsArticleModel = mongoose.model('article', newsArticle);


module.exports = newsArticleModel