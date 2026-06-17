const assert = require('node:assert/strict');
const { LRUCache } = require('./LRUCache');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function test(name, fn) {
  return fn()
    .then(() => {
      console.log(`PASS: ${name}`);
    })
    .catch((error) => {
      console.error(`FAIL: ${name}`);
      throw error;
    });
}

function testSync(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

async function run() {
  testSync('constructor rejects negative capacity', () => {
    assert.throws(() => new LRUCache(-1), TypeError);
  });

  testSync('constructor accepts capacity 0', () => {
    const cache = new LRUCache(0);
    cache.put(1, 1);
    assert.equal(cache.get(1), -1);
  });

  testSync('basic get and put without ttl', () => {
    const cache = new LRUCache(2);
    cache.put(1, 10);
    cache.put(2, 20);
    assert.equal(cache.get(1), 10);
    assert.equal(cache.get(2), 20);
  });

  testSync('get returns -1 for missing key', () => {
    const cache = new LRUCache(2);
    assert.equal(cache.get(99), -1);
  });

  testSync('put updates existing key and refreshes recency', () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.put(1, 100);
    cache.put(3, 3);
    assert.equal(cache.get(1), 100);
    assert.equal(cache.get(2), -1);
    assert.equal(cache.get(3), 3);
  });

  testSync('evicts least recently used item when full', () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.get(1);
    cache.put(3, 3);
    assert.equal(cache.get(2), -1);
    assert.equal(cache.get(1), 1);
    assert.equal(cache.get(3), 3);
  });

  await test('entry expires after ttl', async () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2, 50);
    assert.equal(cache.get(2), 2);
    await sleep(60);
    assert.equal(cache.get(2), -1);
    assert.equal(cache.get(1), 1);
  });

  testSync('negative ttl is treated as immediately expired', () => {
    const cache = new LRUCache(2);
    cache.put(1, 1, -100);
    assert.equal(cache.get(1), -1);
  });

  testSync('expired entry does not occupy capacity', () => {
    const cache = new LRUCache(2);
    cache.put(1, 1, -1);
    cache.put(2, 2);
    cache.put(3, 3);
    assert.equal(cache.get(1), -1);
    assert.equal(cache.get(2), 2);
    assert.equal(cache.get(3), 3);
  });

  testSync('updating key with ttl resets expiration', async () => {
    const cache = new LRUCache(2);
    cache.put(1, 1, 30);
    await sleep(20);
    cache.put(1, 10, 100);
    await sleep(20);
    assert.equal(cache.get(1), 10);
  });

  testSync('invalid key type throws', () => {
    const cache = new LRUCache(2);
    assert.throws(() => cache.get('a'), TypeError);
    assert.throws(() => cache.put('a', 1), TypeError);
  });

  testSync('invalid value type throws', () => {
    const cache = new LRUCache(2);
    assert.throws(() => cache.put(1, 'x'), TypeError);
  });

  testSync('invalid ttl type throws', () => {
    const cache = new LRUCache(2);
    assert.throws(() => cache.put(1, 1, 'bad'), TypeError);
  });

  await test('async methods serialize concurrent access', async () => {
    const cache = new LRUCache(1);
    const results = await Promise.all([
      cache.putAsync(1, 1),
      cache.putAsync(2, 2),
      cache.getAsync(1),
      cache.getAsync(2),
    ]);
    assert.equal(results[2], -1);
    assert.equal(results[3], 2);
  });

  testSync('example from task description', () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2, 1000);
    assert.equal(cache.get(1), 1);
    assert.equal(cache.get(2), 2);
    cache.put(3, 3);
    assert.equal(cache.get(1), -1);
    assert.equal(cache.get(2), 2);
    assert.equal(cache.get(3), 3);
  });

  await test('example expiration path after time passes', async () => {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2, 50);
    assert.equal(cache.get(1), 1);
    assert.equal(cache.get(2), 2);
    await sleep(60);
    assert.equal(cache.get(2), -1);
  });
}

run()
  .then(() => {
    console.log('\nAll tests passed.');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
