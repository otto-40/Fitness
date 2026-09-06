/* Exercise the real worker against HTTP failures and cache failures without
   a browser or network. Browser app tests still cover the user workflows. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

function worker({ network, cached, cacheError = false }) {
  const handlers = {}, writes = [], pending = [];
  const context = {
    self: { addEventListener: (name, fn) => { handlers[name] = fn; } },
    fetch: network,
    caches: {
      match: async () => cached,
      open: async () => ({ put: async (key, response) => {
        if (cacheError) throw Error('cache quota');
        writes.push({ key, response });
        cached = response;
      } })
    }
  };
  vm.runInNewContext(source, context);
  return {
    writes,
    async navigate() {
      let response;
      handlers.fetch({
        request: { method: 'GET', mode: 'navigate' },
        respondWith: promise => { response = promise; },
        waitUntil: promise => pending.push(promise)
      });
      const result = await response;
      await Promise.all(pending);
      return result;
    }
  };
}
function page(status, body) {
  return { status, body, ok: status >= 200 && status < 300, clone() { return page(status, body); } };
}

test('HTTP errors preserve and serve the working offline page', async () => {
  for (const status of [404, 500, 503]) {
    const good = page(200, 'working app');
    let offline = false;
    const sw = worker({ cached: good, network: async () => {
      if (offline) throw Error('offline');
      return page(status, 'error page');
    } });
    assert.equal(await sw.navigate(), good);
    assert.equal(sw.writes.length, 0);
    offline = true;
    assert.equal(await sw.navigate(), good);
  }
});

test('without a cached page, an HTTP error remains an honest HTTP response', async () => {
  const error = page(503, 'unavailable');
  const sw = worker({ network: async () => error });
  assert.equal(await sw.navigate(), error);
  assert.equal(sw.writes.length, 0);
});

test('a successful navigation refreshes the fallback for the next offline visit', async () => {
  let offline = false;
  const sw = worker({ cached: page(200, 'old app'), network: async () => {
    if (offline) throw Error('offline');
    return page(200, 'new app');
  } });
  assert.equal((await sw.navigate()).body, 'new app');
  assert.equal(sw.writes[0].key, './index.html');
  offline = true;
  assert.equal((await sw.navigate()).body, 'new app');
});

test('cache quota failures do not prevent a successful live page from loading', async () => {
  const sw = worker({ cacheError: true, network: async () => page(200, 'live app') });
  assert.equal((await sw.navigate()).body, 'live app');
  assert.equal(sw.writes.length, 0);
});
