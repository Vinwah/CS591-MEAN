// Methods for getting newsArticles and newsArticle caching in the DB

let config = require('../config')
let request = require('request-promise-lite')
let NLU = require('watson-developer-cloud/natural-language-understanding/v1.js');

let newsArticle  = require('../models/newsArticleModel')
let searchPhrase = require('../models/searchPhraseModel')
let async = require('async')



// Input:   source = {id, name, sortby}
// Output:  Promise that resolves with list of all current "NEWS-API" articles from the input source
// Description: Get 10 latest (or top) articles from source
newsArticle.getArticlesFromSource = function(source){
    return new Promise(function(resolve, reject){
        // set up call and request it
        let url = 'https://newsapi.org/v1/articles?source=' + source.id + '&sortBy=' + source.sortBy + '&apiKey=' + config.newsAPI.apiKey
        request.get(url, {json: true})
            .then(function(result){
                // parse result (insert source name as part of each article object)
                let i = 0;
                while(i < result.articles.length){
                    result.articles[i].source = result.source
                    i++;
                }
                resolve(result.articles)
            })
            .catch(function(err){reject(err)})
    })
}


// Input:    [source]
// Output:   Returns a promise that resolve with [articles]
// Description: Get 10 latest (or top) articles from several sources
newsArticle.getAllArticlesFromAPI = function(sources){
    return new Promise(function(resolve, reject){
        // Map each source with getArticlesFromSource
        let articlesPromise = sources.map(newsArticle.getArticlesFromSource)

        // concurrently get all articles from all sources
        Promise.all(articlesPromise)
            // When all articles has been loaded parse result ([[article]] --> [article])
            .then((data)=>{
                let fullSetOfArticles = []
                data.forEach(function(source){
                    source.forEach(function(article){
                        fullSetOfArticles.push(article)
                    })
                })
                resolve(fullSetOfArticles)
            })
            .catch((err) => reject(err))
    })
}

// Input: url of article, array of target phrases
// Output: Returns a Promise that resolves with the news article's sentiment for each target:
//         [{text: target[i], label: positive/negative/neutral, score: num in range[-1,1]}]
// Description: Gets the article's sentiment for the list of target phrases
newsArticle.getSentimentOfArticle = function(url, targets){
    return new Promise(function(resolve, reject){
        // set up my Watson Natural Language Understanding configs
        let myNLU = new NLU({
            'username': config.watson.username,
            'password': config.watson.password,
            'version_date': config.watson.version_date
        });

        // Set up the parameters for that call (url and targets)
        var parameters = {
            'url': url,
            'features': {
                'sentiment': {
                    'targets': targets
                }
            }
        };

        // Make call on url and targets
        myNLU.analyze(parameters, function(err, response) {
            // If error code = 400, resolve with neutral object (occurs if the page given is not analyzable)
            // if some other error, resolve with empty array
            if (err) {
                console.log('myNLU threw err: ', err)
                if(err.code == 400){
                    resolve([{"label" : "neutral", "score" : 0, "text" : targets[0]}])
                }
                else{resolve([])}
            }
            // resolve with sentiments
            else {
                console.log('myNLU used – url:', url)
                resolve(response.sentiment.targets);
            }
        });
    })
}


// Input:
// Output: Promise that resolves with null
// Description: Removes all old  articles (older than 7 days) from the DB
newsArticle.deleteOldArticles = function(){
    return new Promise(function(resolve, reject) {

        // takes current time and subtracts 7 days from it
        let latestDateAllowed = new Date;
        latestDateAllowed.setDate(latestDateAllowed.getDate() - 7);

        // Mongoos find sources that are older than 7 days
        newsArticle.find({"publishedAt": {"$lt": latestDateAllowed}})
            .then(function (result) {
                // map remove to all old articles found
                let removePromises = result.map(function (doc) {
                    newsArticle.findOneAndRemove({_id: doc._id})
                })
                // remove all, and resolve after all are done
                Promise.all(removePromises)
                    .then(function () {
                        resolve()
                    })
                    .catch(function (err) {
                        reject(err)
                    })
            })
            .catch(function (err) {
                reject(err)
            })
    })
}

// Input:
// Output: Promise that resolves with the new articles that were inserted in to the DB
// Description: Get new articles from API, and insert them in to the DB
newsArticle.insertNewArticlesInDB = function(){
    return new Promise(function(resolve, reject){
        // Get all articles available from NEWSAPI on the sources defined in config
        newsArticle.getAllArticlesFromAPI(config.newsAPI.limitedSourceList)
            .then(function(articles){
                // For each article, add a ratings attribute that is empty, and insert in DB.
                // If already there, do not update the current version ($setOnInsert)
                let myMap = articles.map(function(article){
                    article.ratings = []
                    return newsArticle.findOneAndUpdate(
                        {url: article.url},
                        {$setOnInsert: article},
                        {upsert: true, new: true}
                    )
                })
                // Apply map to all articles
                Promise.all(myMap)
                    // resolve when all promises has returned
                    .then(result => resolve(result))
            })
            .catch(err => reject(err))
    })
}


// Input:   The article that should be evaluated.
//          Array of the phrases that the sentiment may need to be evaluated for in the article
// Output: Returns a Promise that resolves with with the updated article
// Description: Updates the ratings field of an article to contain sentiment for all relevant phrases
newsArticle.updateArticleSentiment = function(article, phraseHist){
    return new Promise(function(resolve, reject){
        // The text that must contain the phrase for it to be evaluated on that phrase(title + description)
        let textForAnalysis = (article.title + ' – ' + article.description).toLowerCase();
        let relevantPhrases = []            // Array to contain the relevant phrases
        let alreadyEveluatedPhrases = []    // Array to contain phrases that has already been eveluated

        // For each phrase already evaluated, add the phrase to list of alreadyEvalutaedPhrases
        article.ratings.forEach(function(rating){alreadyEveluatedPhrases.push(rating.text.toLowerCase())})

        // for each phrase in the phrase list, if the phrase is in the title or description of the article and
        // it has not been evaluated before, add it to relevantPhrases
        phraseHist.forEach(function(phrase){
            if ((textForAnalysis.indexOf(phrase.toLowerCase()) > -1)
                && (alreadyEveluatedPhrases.indexOf(phrase.toLowerCase()) == -1)){
                relevantPhrases.push(phrase)
            }
        })

        //If article has relevatn phrases that it has not been evalueted for before:
        if (relevantPhrases.length > 0){
            // Evaluate the article for phrases that has yet to be evaluated
            newsArticle.getSentimentOfArticle(article.url, relevantPhrases)
                .then(function(ratings){
                    // When evaluated, add to ratings list of article, and update DB to this new version
                    ratings.forEach((rating) => article.ratings.push(rating))
                    newsArticle.findOneAndUpdate({url: article.url},article,{upsert: true, new: true})
                        // Resolve with the new article
                        .then(returned => resolve(returned))
                        .catch(err => { reject(err)})
                })
                .catch(err => { reject(err)})
        }
        // If non of the phrases are in the description or the ones that are has already been evaluated, resolve
        // with that version
        else{
            resolve(article)
        }
    })

}


// input:
// Output: returns a promise that resolves with a list of all current versions of articles
// Description: Updates sentiment for all earlier searched for phrases in all articles
newsArticle.updateSentimentForAllArticles = function(){
    return new Promise(function(resolve, reject){
        // find all searchPhrases
        searchPhrase.find({})
            .then(function(searchPhrases){
                // parse result to be on format ['phrase']
                let targets = []
                searchPhrases.forEach(searchPhrase => targets.push(searchPhrase._doc.phrase))

                // find all articles
                newsArticle.find({})
                    .then(function(result){
                        let myMap = result.map(function(obj){
                            return newsArticle.updateArticleSentiment(obj._doc, targets)
                        })
                        // run updateArticleSentiment on all articles
                        Promise.all(myMap)
                        // when all are resolved, return the current version of all articles
                            .then(resultFromAll => resolve(resultFromAll))
                            .catch(err => { reject(err)})
                    })
                    .catch(err => { reject(err)})
            })
            .catch(err => { reject(err)})
    })
}



//input: the phrase that was searched for; list of all sources that were searched for
//Output: Returnes a Promise that resolves with an object containing: {sourceID, overall sentiment of source, [articles]}
newsArticle.getArticlesMatching = function(thePhrase, sources){
    return new Promise(function(resolve, reject){
        let returned = []
        // for each source, set up a source object containing source id, sourceOverallRating
        // of sentiment for the phrase and a list of all the sources
        let myMap = sources.map(function(source){
            let temp = {source: source, sourceRating: 0, articles: []}
            return new Promise(function(resolve, reject){
                // find articles that match sources and has sentiment indicated for the phrase
                newsArticle.find({source: source, ratings: {$elemMatch: {text: thePhrase}}})
                    .then(function(articles){
                        // Insert the articles found into the articles array of the source obj
                        articles.forEach(article => temp.articles.push(article._doc))
                        returned.push(temp)
                        resolve()
                    })
                    .catch(err => reject(err))
            })
        })
        Promise.all(myMap)
            .then(function(){
                // when all articles has been inserted into the appropriate source object's articles field,
                // remove the sentiment ratings for other phrases that is stored on the article
                resultRemoveIrrelevantRatings(returned, thePhrase)
                    .then(function(parsedResult){
                        // find source sentiment rating for each source
                        let sourceRatingMap = parsedResult.map(getSourceRating)
                        Promise.all(sourceRatingMap)
                            // resolve with array of all the source objects
                            .then(resolve(parsedResult))
                    })
            })
            .catch(err => reject(err))
    })
}


// Input: source object {source: source, ratings: {$elemMatch: {text: thePhrase}}}
// Output: returnes a promise that resolves with the new version of the source object
// Description: finds the rating of the source and makes it the source object's sourceRating
let getSourceRating = function(sourceObj){
    return new Promise(function(resolve, reject){
        // if source got no articles, rating = 0
        if (sourceObj.articles.length == 0){
            sourceObj.sourceRating = 0
            resolve(sourceObj)
        }
        // the source rating = the average of the sentiment of all articles regarding the phrase
        else{
            sourceObj.articles.forEach(article => sourceObj.sourceRating += (article.rating.score/sourceObj.articles.length))
            resolve(sourceObj)
        }

    })
}

// Input: [source obj]
// Output: Promise that resolves with the source objects []
let resultRemoveIrrelevantRatings = function(result, phrase){
    return new Promise(function(resolve, reject){
        // For every object, remove ratings that are not the relevant phrase
        let myMap = result.map(sourceObj => sourceRemoveIrrelevantRatings(sourceObj, phrase))

        Promise.all(myMap)
            .then(parsedResult => {result = parsedResult; resolve(result)})
            .catch(err => reject(err))
    })
}

// Input: source object
// Output: Promise that resolves with the source object
let sourceRemoveIrrelevantRatings = function(sourceObj, phrase){
    return new Promise(function(resolve, reject){
        //for every article, remove irrelevant ratings
        let myMap = sourceObj.articles.map(article => articleRemoveIrrelevantRatings(article, phrase))

        Promise.all(myMap)
            .then(result => {sourceObj.articles = result; resolve(sourceObj)})
            .catch(err => reject(err))
    })
}

// Input: article
// Output: Promise that resolves with the article, all ratings that does not correspond to the phrase are removed
let articleRemoveIrrelevantRatings = function(article, phrase){
    return new Promise(function(resolve, reject){
        // find index of the rating corresponding to the phrase
        findIndexWithAttribute(article.ratings, 'text', phrase)
            .then(function(index){
                // if it exist, set article.rating to that rating and set article.ratings to false
                if (index > -1){
                    article.rating = article.ratings[index]
                    article.ratings = null
                    resolve(article)
                }
                // otherwise, return a rating of 0 since it does not exist
                else{
                    article.rating = {text: phrase, score: 0, label: 'neutral'}
                    article.ratings = null
                    resolve(article)
                }
            })
            .catch(err => reject(err))
    })
}


// Input: array of objects, attribute to find, value of the attribute
// output, returns a promise, resolving with the index of the array that contain the attribute with the value
let findIndexWithAttribute = function(arr, atr, val){
    return new Promise(function(resolve){
        // iterate over all array elements, look at the attribute and check if it matches value, if so resolve with index
        for(let i = 0; i < arr.length; i++){
            if (arr[i][atr] == val){resolve(i)}
        }
        // otherwise, resolve with 0
        resolve(-1)
    })
}

module.exports = newsArticle
