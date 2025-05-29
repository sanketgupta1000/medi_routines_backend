// load the environment variables from the .env file
require('dotenv').config();

const config = {
    mongoDbConnection: String(process.env.MONGODB_CONNECTION),
    jwtSecret: String(process.env.JWT_SECRET),
    nodeEnv: String(process.env.NODE_ENV),
    port: String(process.env.PORT)
};

module.exports = config;