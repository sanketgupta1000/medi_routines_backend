// import the app
const app = require('./app.js');
const mongoose = require('mongoose');
const config = require('./src/configs/config.js');

// connect to mongodb
mongoose
.connect(config.mongoDbConnection)
.then(() => {
    console.log('Connected to MongoDB');
    // start the server
    app.listen(3000, () => {
        console.log('Server is running on port 3000');
    });
})
.catch((err) => {
    console.log('Error connecting to MongoDB');
    console.log(err);
});