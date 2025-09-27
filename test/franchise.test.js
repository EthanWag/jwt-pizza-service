const request = require('supertest');
const app = require('../src/service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const testFranchisee = {name: 'test franchisee', email: 'frn@test.com', password: 'b', roles: [{role: 'franchisee'}]};


// tests franchisee endpoints
beforeAll(async () => {
    // register a new franchisee here
    // Add a few franchises to that user

    // methods covered
    // create franchisee
    // create franchise
    // maybe login in?
});

test('franchisee login', async () => {

});

test('create franchise', async () => {

});

test('get franchise with id', async () => {

});

test('get franchises with obj', async () => {

});

test('Delete franchise', async () => {

});
