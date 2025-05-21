const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// before all tests, create a new in-memory MongoDB server
// and connect to it
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_CONNECTION = mongoServer.getUri();
    await mongoose.connect(process.env.MONGODB_CONNECTION, { dbName: "test" });
    // log the users
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log("Users in the database: ", users);
});

// after all tests, disconnect from the in-memory MongoDB server
// and stop the server
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// before each test, clear the database
beforeEach(async()=>
{
    await mongoose.connection.db.dropDatabase();
})

const app = require('../app');

describe('User Routes', () => {
    it('should signup a user', async () => {
        const res = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res.statusCode).toBe(201);
        // expect body to have {user: { name, email, timezone } }
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('name', 'Test User');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
        expect(res.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res.body.user).not.toHaveProperty('password');
    });

    it('should not signup with existing email', async () => {
        const res1 = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test2@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        
        // 1st user should be created successfully
        expect(res1.statusCode).toBe(201);
        expect(res1.body).toHaveProperty('user');
        expect(res1.body.user).toHaveProperty('name', 'Test User');
        expect(res1.body.user).toHaveProperty('email', 'test2@example.com');
        expect(res1.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res1.body.user).not.toHaveProperty('password');
        
        // 2nd user should not be created
        // with the same email
        const res = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test2@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res.statusCode).toBe(409);
    });

    // more tests:
    // 1. should not signup with incomplete data
    it('should not signup with incomplete data', async () => {
        const res = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res.statusCode).toBe(422);
        expect(res.body).toHaveProperty('message', 'Invalid inputs passed, please check your data.');
    });

    // 2. should not signup with invalid email
    it('should not signup with invalid email', async () => {
        const res = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "testexample.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res.statusCode).toBe(422);
        expect(res.body).toHaveProperty('message', 'Invalid inputs passed, please check your data.');
    });

    // now test login
    it('should login a user', async () => {
        const res1 = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res1.statusCode).toBe(201);
        expect(res1.body).toHaveProperty('user');
        expect(res1.body.user).toHaveProperty('name', 'Test User');
        expect(res1.body.user).toHaveProperty('email', 'test@example.com');
        expect(res1.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res1.body.user).not.toHaveProperty('password');

        const res2 = await request(app)
            .post('/api/user/login')
            .send({
                email: "test@example.com",
                password: "password123"
            });
        expect(res2.statusCode).toBe(200);
        expect(res2.body).toHaveProperty('token');
        console.log("Token: ", res2.body.token);
    });

    // should not login with incorrect body
    it('should not login with incorrect body', async () => {
        const res = await request(app)
            .post('/api/user/login')
            .send({
                name: "test@example.com",
                password: "password123"
            });
        expect(res.statusCode).toBe(422);
        expect(res.body).toHaveProperty('message', 'Invalid inputs, please try again.');
    });

    // should not login with incorrect email
    it('should not login with incorrect email', async () => {
        const res = await request(app)
            .post('/api/user/login')
            .send({
                email: "test1@example.com",
                password: "password123"
            });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Incorrect credentials');
    });

    // correct email but incorrect password
    it('should not login with incorrect password', async () => {
        const res1 = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res1.statusCode).toBe(201);
        expect(res1.body).toHaveProperty('user');
        expect(res1.body.user).toHaveProperty('name', 'Test User');
        expect(res1.body.user).toHaveProperty('email', 'test@example.com');
        expect(res1.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res1.body.user).not.toHaveProperty('password');

        const res2 = await request(app)
            .post('/api/user/login')
            .send({
                email: "test@example.com",
                password: "wrongpassword"
            });
        expect(res2.statusCode).toBe(401);
        expect(res2.body).toHaveProperty('message', 'Incorrect credentials');
    });

    // test get user
    it('should get user details', async () => {
        const res1 = await request(app)
            .post('/api/user/signup')
            .send({
                name: "Test User",
                email: "test@example.com",
                password: "password123",
                timezone: "Asia/Kolkata"
            });
        expect(res1.statusCode).toBe(201);
        expect(res1.body).toHaveProperty('user');
        expect(res1.body.user).toHaveProperty('name', 'Test User');
        expect(res1.body.user).toHaveProperty('email', 'test@example.com');
        expect(res1.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res1.body.user).not.toHaveProperty('password');

        const res2 = await request(app)
            .post('/api/user/login')
            .send({
                email: "test@example.com",
                password: "password123"
            });
        expect(res2.statusCode).toBe(200);
        expect(res2.body).toHaveProperty('token');
        console.log("Token: ", res2.body.token);
        const token = res2.body.token;

        const res3 = await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer ${token}`);
        expect(res3.statusCode).toBe(200);
        expect(res3.body).toHaveProperty('user');
        expect(res3.body.user).toHaveProperty('name', 'Test User');
        expect(res3.body.user).toHaveProperty('email', 'test@example.com');
        expect(res3.body.user).toHaveProperty('timezone', 'Asia/Kolkata');
        expect(res3.body.user).not.toHaveProperty('password');
        expect(res3.body.user).toHaveProperty('id', res1.body.user.id);
    });

    // test get user without authorization header
    it('should not get user details without authorization header', async () => {
        const res = await request(app)
            .get('/api/user');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Authorization header is missing');
    });

    // test get user without token
    it('should not get user details without token', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', 'Bearer ');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Token is missing');
    });

    // test get user with invalid token
    it('should not get user details with invalid token', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Token is invalid');
    });

    // test get user without authorization header
    it('should not get user details without authorization header', async () => {
        const res = await request(app)
            .get('/api/user');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Authorization header is missing');
    });

    // test get user without token
    it('should not get user details without token', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', 'Bearer ');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Token is missing');
    });

    // test get user with invalid token
    it('should not get user details with invalid token', async () => {
        const res = await request(app)
            .get('/api/user')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Token is invalid');
    });
});