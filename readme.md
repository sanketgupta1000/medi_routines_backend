# Notes for the project

## Purpose

A web app to manage routines of medicines for the users.

## Database Description

A user can have many routines. A routine can have many medicines. A medicine in a routine can either be one of the pre-defined medicines or it may be added by the user (for them only). A medicine in a routine can be associated with many days of the week, and for every day medicine is associated with, it can be taken on any time: morning, afternoon, evening, or a combination of these.

This is more like a blueprint, need to store whether medicine was actually or not on a particular date too.

## Dependencies (node packages) :

- bcrypt: for hashing passwords
- cors: for cross-origin resource sharing
- dotenv: for loading environment variables
- express: for creating the server
- express-validator: for validating request data
- jsonwebtoken: for creating and verifying JWT tokens (will check later if this alone is sufficient)
- mongoose: for connecting to MongoDB
- nodemon: for automatically restarting the server during development