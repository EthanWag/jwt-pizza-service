const request = require('supertest');
const app = require('../src/service');

const testAdmin = {name:'test admin',email:'a@test.com', password:'a'}
const testFranchisee = {name:'pizza franchisee', email:'f@jwt.com', password:'franchisee'};

let franchiseeToken;
let franchiseId;
let userId;

// tests franchisee endpoints
beforeEach(async () => {
    // Logs in the franchisee
    const res = await request(app).put('/api/auth').send(testFranchisee);
    expect(res.status).toBe(200);

    // save the token and Id
    userId = res.body.user.id;
    franchiseeToken = res.body.token;
    franchiseId = res.body.user.roles.find(r => r.role === 'franchisee').objectId;
    expect(franchiseId).toBeGreaterThan(-1);
});

afterEach(async () => {
    // Deletes the franchisee
    const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${franchiseeToken}`);
    expect(res.status).toBe(200);
});

test('creation and delation of stores', async () => {

    const storeName = 'Windhelm';

    let res = await request(app).post(`/api/franchise/${franchiseId}/store`).send({name: storeName, "admins": [{"email": testFranchisee.email}]}).set('Authorization', `Bearer ${franchiseeToken}`);
    expect(res.status).toBe(200);

    // check to see if I got the same store back
    const testStore = res.body;
    expect(testStore.name).toBe(storeName);
    expect(testStore.franchiseId).toBe(franchiseId);

    // want to clean up my database so I'll also delete it
    res = await request(app).delete(`/api/franchise/${franchiseId}/store/${testStore.id}`).set('Authorization', `Bearer ${franchiseeToken}`);
    expect(res.status).toBe(200);
});

test('get stores by Id', async () => {
    const storeNames = ['Solitude', 'Whiterun', 'Riften'];

    for (let storeName of storeNames) {
        let res = await request(app).post(`/api/franchise/${franchiseId}/store`).send({name: storeName, "admins": [{"email": testFranchisee.email}]}).set('Authorization', `Bearer ${franchiseeToken}`);
        expect(res.status).toBe(200);
    }

    // now get the franchises by userId

    res = await request(app).get(`/api/franchise/${userId}`).set('Authorization', `Bearer ${franchiseeToken}`);
    expect(res.status).toBe(200);



});

test('get franchises with obj', async () => {

});

test('Delete franchise', async () => {

});
