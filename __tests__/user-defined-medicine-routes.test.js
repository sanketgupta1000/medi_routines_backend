const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongoServer;
let app;
let token;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
    process.env.MONGODB_CONNECTION = mongoServer.getUri();
    app = require('../app');
    await mongoose.connect(process.env.MONGODB_CONNECTION, { dbName: "test" });
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    // Signup and login a user to get a token for secure routes
    const signupRes = await request(app)
        .post('/api/user/signup')
        .send({
            name: "Test User",
            email: "test@example.com",
            password: "password123",
            timezone: "Asia/Kolkata"
        });
    expect(signupRes.statusCode).toBe(201);

    const loginRes = await request(app)
        .post('/api/user/login')
        .send({
            email: "test@example.com",
            password: "password123"
        });
    expect(loginRes.statusCode).toBe(200);
    token = loginRes.body.token;
});

describe('User Defined Medicine Routes', () => {
    // 1a. Unauthenticated user tries to create
    it('should not allow unauthenticated user to create a user-defined medicine', async () => {
        const res = await request(app)
            .post('/api/user-defined-medicine')
            .send({ name: "My Custom Med" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Authorization header is missing');
    });

    // 1b. Incorrect input body
    it('should not create a user-defined medicine with incorrect input', async () => {
        const res = await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(res.statusCode).toBe(422);
        expect(res.body).toHaveProperty('message', 'Invalid inputs passed, please check your data.');
    });

    // 1c. Correct input body
    it('should create a user-defined medicine with correct input', async () => {
        const res = await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "My Custom Med" });
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('userDefinedMedicine');
        expect(res.body.userDefinedMedicine).toHaveProperty('name', 'My Custom Med');
        expect(res.body.userDefinedMedicine).toHaveProperty('id');
    });

    // 2a. Unauthenticated user tries to get all
    it('should not allow unauthenticated user to get user-defined medicines', async () => {
        const res = await request(app)
            .get('/api/user-defined-medicine');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Authorization header is missing');
    });

    // 2b. Authenticated user gets all
    it('should allow authenticated user to get all user-defined medicines', async () => {
        // Create two medicines
        await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "Med1" });
        await request(app)
            .post('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: "Med2" });

        const res = await request(app)
            .get('/api/user-defined-medicine')
            .set('Authorization', `Bearer ${token}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('userDefinedMedicines');
        expect(Array.isArray(res.body.userDefinedMedicines)).toBe(true);
        expect(res.body.userDefinedMedicines.length).toBe(2);
        const medNames = res.body.userDefinedMedicines.map(m => m.name);
        expect(medNames).toContain('Med1');
        expect(medNames).toContain('Med2');
        // console.log(res.body);
    });
});