let express = require('express');
let router = express.Router();

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/cs591');
const db = mongoose.connection;


db.once('open', function () {
    console.log('Connection successful.')
});

const Schema = mongoose.Schema;
const hw2Schema = new Schema({
    theString: String,
    theLength: String
});


const stringModel = mongoose.model('string', hw2Schema);

/* GET home page. */
router.get('/', function(req, res, next) {
    stringModel.find({}, function (err, results) {
        if (err) {res.json(err)}
        else{
            let parsed = []
            for (var i = 0; i < results.length; i++) {
                parsed.push({
                    string: results[i]._doc.theString,
                    length: results[i]._doc.theLength
                })
            }
            res.json(parsed)}
    })
});



router.get('/:string', function(req, res, next) {

    stringModel.find({theString: req.params.string}, function (err, results) {
        if (err) {res.json(err)}
        else{
            if (results.length != 0){
                res.json({string: results[0]._doc.theString, length: results[0]._doc.theLength})
            }
            else {
                let theString = req.params.string;
                let lenOfString = theString.length;
                const aString = new stringModel ( {theString: theString, theLength: lenOfString})
                aString.save(function(err, results) {
                    if (err) {res.send(err)}

                    else {res.json({string: results._doc.theString, length: results._doc.theLength})}
                });
            }
        }
    })
});

router.post('/', function(req, res, next){
    if (req.body.string && req.body.string != "") {
        stringModel.find({theString: req.body.string}, function(err, results){
            if (err) {res.json(err)}
            else{
                if (results.length != 0){
                    res.json({string: results[0]._doc.theString, length: results[0]._doc.theLength})
                }
                else {
                    let theString = req.body.string;
                    let lenOfString = req.body.string.length;
                    const aString = new stringModel ( {theString: theString, theLength: lenOfString})
                    aString.save(function(err, results) {
                        if (err) {res.send(err)}

                        else {res.json({string: results._doc.theString, length: results._doc.theLength})}
                    });
                }
            }
        })
    }else{
        res.json({error: "When doing post, a string must be provided: key=string, value='input string'"})
    }
})


router.delete('/', function(req, res, next) {
    res.json({error: "String must be provided in url '/hw2/someStringToDelete'"})
});


router.delete('/:string', function(req, res, next) {
    stringModel.find({theString: req.params.string}, function (err, results) {
        if (err) {res.json(err)}
        else{
            if (results.length != 0){
                stringModel.findOneAndRemove({ theString: req.params.string }, function(err) {
                    if (err) {res.json(err)}
                    else {
                        res.json({string: results[0]._doc.theString, length: results[0]._doc.theLength})
                    }
                });
            }
            else {
                res.json({error: "String not found"})

            }
        }
    })
});

module.exports = router;