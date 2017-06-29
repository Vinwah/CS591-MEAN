// Routs used by the application to get articles from DB

let express = require('express');
let router  = express.Router();
let request = require('request-promise-lite')

let config = require('../config');
let authorized = require('../controllers/authChecker');
let newsArticleController = require('../controllers/newsArticleController');
let searchPhraseController = require('../controllers/searchPhraseController');
let newsArticleModel = require('../models/newsArticleModel');

// Get an array of source Objects [{source, sourceRating, [Articles]}] for the indicated sources and the given phrase
// Needs authorization to be executed
router.get('/articles/:thePhrase', authorized, function (req, res, next) {
    // if only one source was requested, change the given source into a one-element arrya
    if (typeof req.query.sources == 'string') {req.query.sources = [req.query.sources]}

    // See if the phrase is already stored in the DB
    searchPhraseController.find({phrase: req.params.thePhrase})
        .then(function(result){
            // if it is not stored in the DB:
            if (result.length == 0){
                // add the phrase to the search history
                searchPhraseController.addOrUpdatePhrase(req.params.thePhrase)
                    .then(
                        // request an update of the DB, so that all relevant articles will be evaluated for the search phrase
                        request.get('http://localhost:3000/admin/articles', {json: true})
                            .then(function(result){
                                // get the articles matching the result ([{source, sourceRating, [Articles]}])
                                newsArticleController.getArticlesMatching(req.params.thePhrase, req.query.sources)
                                    // return result to caller
                                    .then(parsedResult => res.json(parsedResult))
                                    .catch(err => res.json({pageToUpdateDB: err}))
                                }
                            )
                            .catch(err => res.json({pageToUpdateDB: err}))
                    )
                    .catch(err => res.json({pageToUpdateDB: err}))
            }
            else{
                // update the occurence count on the search history of the phrase
                searchPhraseController.addOrUpdatePhrase(req.params.thePhrase)
                    // get the articles matching the result ([{source, sourceRating, [Articles]}])
                    .then(newsArticleController.getArticlesMatching(req.params.thePhrase, req.query.sources)
                        // return result to caller
                        .then(parsedResult => {res.json(parsedResult)})
                        .catch(err => res.json({pageToUpdateDB: err})))
                    .catch(err => res.json({pageToUpdateDB: err}))
            }
        })
        .catch(err => {res.json({pageToUpdateDB: err})})
})

module.exports = router;