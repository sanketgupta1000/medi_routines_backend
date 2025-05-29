// import the app
const app = require('./app.js');
const mongoose = require('mongoose');
const config = require('./src/configs/config.js');
const { scheduleDailyNotifications } = require('./src/services/scheduler-service.js');

// connect to mongodb
mongoose
.connect(config.mongoDbConnection)
.then(() => {
    console.log('Connected to MongoDB');
    // start the server
    app.listen(config.port, () => {
        console.log('Server is running on port 3000');
    });

    // start the notification service
    scheduleDailyNotifications();
})
.catch((err) => {
    console.log('Error connecting to MongoDB');
    console.log(err);
});