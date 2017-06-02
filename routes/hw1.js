var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('hw1');
});


router.get('/:string', function(req, res, next) {
    let theString = req.params.string;
    let lenOfString = theString.length;
    res.send({
        "string:" : theString,
        "length:" : lenOfString
    });
});

router.post('/', function(req, res, next){
    req.body.length = req.body.string.length
    res.send(JSON.stringify(req.body))
})

module.exports = router;