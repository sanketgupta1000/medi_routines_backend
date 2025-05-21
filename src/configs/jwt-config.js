const jwt = require('jsonwebtoken');
const config = require('./config');
const HttpError = require('../models/HttpError');

// create a middleware to secure api routes

const secureRoute = (req, res, next) => {
    // check if the request has an authorization header
    if (!req.headers.authorization)
    {
        // create HttpError
        const error = new HttpError('Authorization header is missing', 401);
        return next(error);
    }

    // get the token from the authorization header
    const token = req.headers.authorization.split(' ')[1];

    if(!token)
    {
        // create HttpError
        const error = new HttpError('Token is missing', 401);
        return next(error);
    }

    // verify the token
    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err)
        {
            // create HttpError
            const error = new HttpError('Token is invalid', 401);
            return next(error);
        }
        req.user = decoded;
        next();
    });
}

module.exports = secureRoute;