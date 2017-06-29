// Methods for operations on the searchPhrase collection in the DB

let searchPhrase = require('../models/searchPhraseModel')

// Update DB search history. If phrase already exist, increment occurrence count, otherwise save the new phrase.
// Resolves promise with the updated document in DB
searchPhrase.addOrUpdatePhrase = function(thePhrase){
    return new Promise(function(resolve, reject){
        // Find phrase in db
        searchPhrase.find({phrase: thePhrase})
            .then(function(result){
                // If phrase was not found, save a new one to DB
                if (result.length == 0){
                    const aPhrase = new searchPhrase({phrase: thePhrase, occurrences: 1})
                    aPhrase.save()
                        .then(result => resolve(result))
                        .catch(err => reject(err))
                }
                // Else, increment occurrences
                else{
                    searchPhrase.findOneAndUpdate({_id: result[0]._id}, {$inc: {occurrences:1}}, {new: true})
                        .then(result => resolve(result))
                        .catch(err => reject(err))
                }
            })
            .catch(err => reject(err))
    })
}

module.exports = searchPhrase