const request = require('supertest');
const app = require('../src/service');

const testUser = { name: 'Adam', email: 'reg@test.com', password: 'a' };
const testAdmin = {name:'常用名字',email:'a@jwt.com', password:'admin'}

let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expect(testUserAuthToken).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/); // custom test to check if UUID
});

afterAll(async () => {
  await request(app).delete('/api/user').set('Authorization', `Bearer ${testUserAuthToken}`);

  if(app && app.close){
    await app.close();
  }
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  console.log(password)
});

test('update', async () => {

  const newName = 'updated name ' + Math.random().toString(36).substring(2, 5);
  const res = await request(app).put(`/api/user/${testUserId}`).set('Authorization', `Bearer ${testUserAuthToken}`).send({
    name: newName,
    password: testUser.password,
    email: testUser.email,
  });
  expect(res.status).toBe(200);
  expect(res.body.user.name).toBe(newName);

  testUser.name = newName;

});

test('list users, no authentication', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users, wrong authentication', async () => {
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + testUserAuthToken);
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {

  // get the test admin
  let res = await request(app).put('/api/auth').send(testAdmin);
  expect(res.status).toBe(200);
  const adminToken = res.body.token;

  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + adminToken);
  expect(listUsersRes.status).toBe(200);

  // figure out some cool tests to do witht this
  const response = listUsersRes.body.users;
});
