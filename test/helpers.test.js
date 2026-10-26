const test = require('node:test');
const assert = require('node:assert/strict');
const {
  paginate,
  generateOrderNumber,
  isOrderNumberConflict,
  roundMoney,
} = require('../src/utils/helpers');

test('paginate applies safe defaults for invalid paging values', function () {
  assert.deepEqual(paginate({ page: '0', limit: 'abc' }), {
    page: 1,
    limit: 10,
    offset: 0,
  });
});

test('paginate converts strings and caps the page size', function () {
  assert.deepEqual(paginate({ page: '2', limit: '1000' }), {
    page: 2,
    limit: 500,
    offset: 500,
  });
});

test('generateOrderNumber produces readable unique numbers', function () {
  var numbers = new Set();
  for (var i = 0; i < 500; i += 1) {
    numbers.add(generateOrderNumber());
  }
  assert.equal(numbers.size, 500);
  assert.match(generateOrderNumber(), /^ORD-\d{8}-\d{6}-[0-9A-F]{6}$/);
  assert.match(generateOrderNumber('GST'), /^GST-\d{8}-\d{6}-[0-9A-F]{6}$/);
});

test('isOrderNumberConflict only matches order-number unique errors', function () {
  assert.equal(isOrderNumberConflict({
    name: 'SequelizeUniqueConstraintError',
    fields: { order_number: {} },
    message: 'duplicate key',
  }), true);

  assert.equal(isOrderNumberConflict({
    name: 'SequelizeUniqueConstraintError',
    fields: { email: {} },
    message: 'duplicate key',
  }), false);

  assert.equal(isOrderNumberConflict(new Error('order_number duplicate')), false);
  assert.equal(isOrderNumberConflict(null), false);
});

test('roundMoney keeps two decimal places', function () {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney('12.345'), 12.35);
});
