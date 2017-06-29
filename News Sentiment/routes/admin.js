// routs that are used to with the DB by admin
// cache news articles, update ratings, remove old articles

let express = require('express');
let router  = express.Router();

let newsArticle  = require('../controllers/newsArticleController');

//inserts the new articles on NEWS-API in to db
router.post('/articles', function(req, res, next) {
    newsArticle.insertNewArticlesInDB()
        .then(() => res.json({pageToUpdateDB: 'DB articles are now up-to-date'}))
        .catch((err) => res.json({pageToUpdateDB: err}))
});

// removes Articles that are older than 1 week from DB
router.delete('/articles', function(req, res, next){
    newsArticle.deleteOldArticles()
        .then(() => res.json({pageToUpdateDB: 'old articles in DB are now removed'}))
        .catch((err) => res.json({pageToUpdateDB: err}))
})

// updates sentiment for all articles for all keywords in search history
router.put('/articles', function(req, res, next){
    newsArticle.updateSentimentForAllArticles()
        .then(() => res.json({pageToUpdateDB: 'All DB articles has sentiments from search history'}))
        .catch(err => res.json({pageToUpdateDB: err}))
})

// full update of database (remove old, add new, update sentiment). used by server periodically to update DB
router.get('/articles', function(req, res, next){
    // Delete olde ones
    newsArticle.deleteOldArticles()
        //insert the new articles
        .then(newsArticle.insertNewArticlesInDB()
            // Update sentiment for all articles
            .then(newsArticle.updateSentimentForAllArticles()
                .then(() => res.json({pageToUpdateDB: 'DB is fully up-to-date'}))
                .catch(err => res.json({pageToUpdateDB: err}))
            )
            .catch(err => res.json({pageToUpdateDB: err}))
        )
        .catch(err => res.json({pageToUpdateDB: err}))
})

module.exports = router