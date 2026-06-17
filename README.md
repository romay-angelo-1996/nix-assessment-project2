# LRU Cache with Expiration

A Node.js implementation of a **Least Recently Used (LRU) cache** with optional per-entry time-to-live (TTL) expiration. Built with a doubly linked list and hash map for O(1) average-case `get` and `put` operations.

No external dependencies — only built-in Node.js features.

## Features

- Fixed capacity with LRU eviction when full
- Optional TTL (milliseconds) per entry; expired entries are removed on access
- Synchronous `get` / `put` API
- Async-safe `getAsync` / `putAsync` for environments where operations may interleave across `await`
- Input validation for capacity, keys, values, and TTL

## Installation

Clone or copy the project files. Node.js 18+ is recommended (uses `node:assert/strict`).

```bash
npm test
```

## Usage

```javascript
const { LRUCache } = require('./LRUCache');

const cache = new LRUCache(2);

cache.put(1, 1);           // No expiration
cache.put(2, 2, 1000);     // Expires after 1 second

console.log(cache.get(1)); // 1
console.log(cache.get(2)); // 2 (if not expired)

cache.put(3, 3);           // Evicts LRU entry (key 1)
console.log(cache.get(1)); // -1 (evicted)
```

### Async API

Use `getAsync` and `putAsync` when multiple callers may run concurrently across async boundaries:

```javascript
await cache.putAsync(1, 100);
const value = await cache.getAsync(1);
```

## API

### `new LRUCache(capacity)`

Creates a cache with a fixed maximum number of entries.

| Parameter  | Type     | Description                          |
|------------|----------|--------------------------------------|
| `capacity` | `number` | Non-negative integer. `0` stores nothing. |

Throws `TypeError` if `capacity` is negative or not an integer.

### `get(key)`

Returns the value for `key` if it exists and has not expired; otherwise returns `-1`. A successful hit updates recency (moves the entry to most recently used).

| Parameter | Type     | Description        |
|-----------|----------|--------------------|
| `key`     | `number` | Integer key        |

**Returns:** `number`

### `put(key, value, ttl?)`

Inserts or updates a key-value pair. If the cache is full, the least recently used entry is evicted after expired entries are purged from the tail.

| Parameter | Type     | Description                                      |
|-----------|----------|--------------------------------------------------|
| `key`     | `number` | Integer key                                      |
| `value`   | `number` | Finite numeric value                             |
| `ttl`     | `number` | Optional expiration in ms from insertion time  |

- Omit `ttl` for no expiration.
- Negative `ttl` is treated as immediately expired (entry is not stored).

### `getAsync(key)` / `putAsync(key, value, ttl?)`

Same behavior as `get` / `put`, but operations are serialized through an internal mutex for safe use across async interleaving.

## Complexity

| Operation | Time (average) | Space        |
|-----------|----------------|--------------|
| `get`     | O(1)           | O(capacity)  |
| `put`     | O(1)           | O(capacity)  |

## Design

**Data structures**

- `Map` — O(1) lookup from key to list node
- Doubly linked list — O(1) move-to-head and evict-from-tail

**Expiration**

Expiration is checked lazily on `get` and `put`. There are no background timers. When the cache is at capacity, expired entries at the LRU tail are removed before evicting a live entry.

**Concurrency**

Node.js is single-threaded, but async code can still interleave logical cache operations between `await` points. `getAsync` and `putAsync` queue work through an `AsyncMutex` so each operation completes before the next begins.

## Input Validation

| Input              | Behavior                                      |
|--------------------|-----------------------------------------------|
| Negative capacity  | Throws `TypeError`                            |
| `capacity = 0`     | `put` is a no-op; `get` always returns `-1`   |
| Non-integer key    | Throws `TypeError`                            |
| Non-finite value   | Throws `TypeError`                            |
| Invalid `ttl`      | Throws `TypeError`                            |
| Negative `ttl`     | Entry treated as expired; not stored          |
| Missing/expired key| `get` returns `-1`                            |

## Tests

```bash
npm test
```

Tests cover:

- Basic get/put and LRU eviction
- TTL expiration and TTL refresh on update
- Edge cases: `capacity = 0`, negative TTL, invalid inputs
- Async concurrent access
- Task example scenarios

## License

MIT
