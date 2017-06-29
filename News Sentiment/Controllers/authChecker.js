// Authorization controller with Passport.

// Check if request is authorized with passport. If not authorized,
// send 401 and break from current request (401 is handled on front end)
const checkAuthorization = function (req, res, next) {
    if (!req.isAuthenticated())
        res.sendStatus(401)
    else next()
}

module.exports = checkAuthorization