class ListNode {
  constructor(key, value, expiresAt = null) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt;
    this.prev = null;
    this.next = null;
  }
}

class AsyncMutex {
  constructor() {
    this._tail = Promise.resolve();
  }
  runExclusive(fn) {
    const run = this._tail.then(() => fn());
    this._tail = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}

class LRUCache {
  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 0) {
      throw new TypeError('capacity must be a non-negative integer');
    }

    this.capacity = capacity;
    this.map = new Map();
    this.head = null;
    this.tail = null;
    this._mutex = new AsyncMutex();
  }

  _isValidKey(key) {
    return typeof key === 'number' && Number.isInteger(key);
  }

  _isExpired(node) {
    return node.expiresAt !== null && Date.now() >= node.expiresAt;
  }

  _resolveExpiresAt(ttl) {
    if (ttl === undefined || ttl === null) {
      return null;
    }
    if (!Number.isFinite(ttl)) {
      throw new TypeError('ttl must be a finite number');
    }
    if (ttl < 0) {
      return Date.now() - 1;
    }
    return Date.now() + ttl;
  }

  _removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
    this.map.delete(node.key);
  }

  _addToHead(node) {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    } else {
      this.tail = node;
    }

    this.head = node;
    this.map.set(node.key, node);
  }

  _moveToHead(node) {
    if (this.head === node) {
      return;
    }
    this._removeNode(node);
    this._addToHead(node);
  }

  _evictTail() {
    if (!this.tail) {
      return;
    }
    this._removeNode(this.tail);
  }

  _purgeExpiredFromTail() {
    while (this.tail && this._isExpired(this.tail)) {
      this._evictTail();
    }
  }

  _get(key) {
    if (!this._isValidKey(key)) {
      throw new TypeError('key must be an integer');
    }

    const node = this.map.get(key);
    if (!node) {
      return -1;
    }

    if (this._isExpired(node)) {
      this._removeNode(node);
      return -1;
    }

    this._moveToHead(node);
    return node.value;
  }


  _put(key, value, ttl) {
    if (!this._isValidKey(key)) {
      throw new TypeError('key must be an integer');
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError('value must be a finite number');
    }

    if (this.capacity === 0) {
      return;
    }

    const expiresAt = this._resolveExpiresAt(ttl);
    const existing = this.map.get(key);

    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      if (this._isExpired(existing)) {
        this._removeNode(existing);
        return;
      }
      this._moveToHead(existing);
      return;
    }

    const node = new ListNode(key, value, expiresAt);
    if (this._isExpired(node)) {
      return;
    }

    this._addToHead(node);

    while (this.map.size > this.capacity) {
      this._purgeExpiredFromTail();
      if (this.map.size > this.capacity) {
        this._evictTail();
      }
    }
  }

  get(key) {
    return this._get(key);
  }

  put(key, value, ttl) {
    this._put(key, value, ttl);
  }

  getAsync(key) {
    return this._mutex.runExclusive(() => this._get(key));
  }


  putAsync(key, value, ttl) {
    return this._mutex.runExclusive(() => {
      this._put(key, value, ttl);
    });
  }
}

module.exports = { LRUCache };
