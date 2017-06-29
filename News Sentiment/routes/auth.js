// routs used for third party authentication

let express = require('express');
let router  = express.Router();
let request = require('request');
let passport = require('passport');
let TwitterStrategy = require('passport-twitter').Strategy;
let User = require('../models/userModel');
let config = require('../config')

passport.use(new TwitterStrategy({
        //set user specific attributes for twitter OAuth
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callbackURL: config.twitter.callbackURL
    },
    function (token, tokenSecret, profile, done) {
        // stores user in DB
        User.findOneAndUpdate({twitterID: profile.id},
            {
                twitterID: profile.id,
                name: profile.displayName,
                username: profile.username
            },
            {'upsert': 'true'},
            function (err, result) {
                if (err) {
                    console.log(err)
                    return done(err, null)
                }
                else {
                    return done(null, profile)
                }
            })
    }
));

// serialization of user
passport.serializeUser(function (user, done) {
    console.log('in serialize, setting id on session:', user.id)
    done(null, user.id)
})

//Deserialization of user
passport.deserializeUser(function (id, done) {
    console.log('in deserialize with id', id)
    User.findOne({twitterID: id}, function (err, user) {
        done(err, user)
    })
})

// route for successful authentication
router.get('/success', function (req, res, next) {
    res.redirect('/')
})

// rout used to log out of current user
router.get('/logout', function (req, res, next) {
    req.logOut();
    res.clearCookie()
    res.status = 401
    res.redirect('/')
})

// authentication with twitter
router.get('/twitter', passport.authenticate('twitter'));

// Call back route used by twitter
router.get('/cb', passport.authenticate('twitter', {failureRedirect: '/login',}), function (req, res) {
        res.cookie('authStatus', 'true')
        res.redirect('/')
    }
)

module.exports = router