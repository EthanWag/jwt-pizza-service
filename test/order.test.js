const request = require('supertest');
const app = require('../src/service');

const testDiner = {name:'test diner', email:'d@jwt.com', password:'diner'};
let token = 'No Token';

beforeAll(async () => {
  // login the user
  const registerRes = await request(app).put('/api/auth').send(testDiner);
  expect(registerRes.status).toBe(200);

  // save the token
  token = registerRes.body.token;
  expect(token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/); // custom test to check if UUID
});

afterAll(async () => {

  // clean up the token
  const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);

  if (app && app.close) {
    await app.close();
  }
});

test('get menu', async () => {
  const res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);

  const menu = res.body;

  // possible menu items given the default values
  for(let item of menu){
    expect(item.title).toEqual(expect.any(String));
    expect(item.description).toEqual(expect.any(String));
    expect(item.price).toEqual(expect.any(Number));
  }
  expect(menu.some((item) => item.title === 'Margarita')).toBeTruthy();
});


test('user makes order', async () => {

  let res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);

  
  expect(res.body.length).toBeGreaterThan(0); // make sure there is anything to order at all

  const menu = res.body;
  const option = menu[Math.floor(Math.random() * menu.length)]; // choose a random item

  res = await request(app).post('/api/order').set('Authorization', `Bearer ${token}`).send({
    franchiseId: 1,
    storeId: 1,
    items: [
      {
        menuId: option.id,
        description: option.description,
        price: option.price,
      },
    ],
  });

  expect(res.status).toBe(200);
  const order = res.body.order;

  // check our order
  expect(order).toBeDefined();
  expect(order.id).toBeDefined();
  expect(order.items.length).toBe(1);
  expect(order.items[0].menuId).toBe(option.id);
  expect(order.items[0].description).toBe(option.description);
  expect(order.items[0].price).toBe(option.price);
});


test('user gets all their orders', async () => {

  // lets make a bunch of orders
  let res = await request(app).get('/api/order/menu');
  expect(res.status).toBe(200);

  
  expect(res.body.length).toBeGreaterThan(0);

  const menu = res.body;

  for(let i = 0; i < 3; i++){

    const option = menu[0]; // just choose the first one

    res = await request(app).post('/api/order').set('Authorization', `Bearer ${token}`).send({
      franchiseId: 1,
      storeId: 1,
      items: [
        {
          menuId: option.id,
          description: option.description,
          price: option.price,
        },
      ],
    });
    expect(res.status).toBe(200); // just checking to make sure everything went through

  }

  res = await request(app).get('/api/order').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);

  const orders = res.body.orders;

  expect(orders.length).toBeGreaterThanOrEqual(3); // we should have at least 3 orders
});
