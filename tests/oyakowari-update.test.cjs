'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const plain = x => JSON.parse(JSON.stringify(x));

function chapter6() {
  const start = source.indexOf('window.CH6=(function(){');
  const end = source.indexOf('window.CH7=(function(){');
  const code = source.slice(start, end).replace(
    'return {init:init, html:CH6_HTML};',
    'return {init:init, html:CH6_HTML, Q:Q, PLANS:PLANS, OTHERS:OTHERS};'
  );
  const context = { window: {} };
  vm.runInNewContext(code, context);
  return plain(context.window.CH6);
}

function reviewContext(initial = {}, failWrite = false) {
  const values = new Map(Object.entries(initial));
  let writes = 0;
  const localStorage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) {
      writes++;
      if (failWrite) throw new Error('Storage unavailable');
      values.set(key, value);
    }
  };
  const start = source.indexOf('function qhash(t)');
  const end = source.indexOf('var Stat=', start);
  const context = { localStorage };
  vm.runInNewContext(source.slice(start, end), context);
  const aliases = [...source.slice(start, end).matchAll(/\[qhash\(("(?:[^"\\]|\\.)*")\), qhash\(("(?:[^"\\]|\\.)*")\)\]/g)]
    .map(m => [JSON.parse(m[1]), JSON.parse(m[2])]);
  return { ...context, values, aliases, writeCount: () => writes };
}

test('all inline scripts and service worker compile', () => {
  assert.equal(scripts.length, 2);
  for (const script of scripts) new vm.Script(script);
  new vm.Script(fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8'));
});

test('all 270 plan questions have valid answers and distinct review keys', () => {
  const { Q } = chapter6();
  const { qhash } = reviewContext();
  const expected = { own: [34, 35, 36, 35], others: [33, 33, 32, 32] };
  const levels = ['beginner', 'intermediate', 'advanced', 'closer'];
  const keys = new Set();
  let count = 0;
  for (const track of ['own', 'others']) {
    levels.forEach((level, i) => {
      assert.equal(Q[track][level].length, expected[track][i]);
      for (const q of Q[track][level]) {
        assert.equal(typeof q.q, 'string');
        assert.ok(q.q && q.ex && q.cat);
        assert.equal(q.o.length, 4);
        assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length);
        assert.ok(!keys.has(qhash(q.q)), 'Duplicate question/review hash: ' + q.q);
        keys.add(qhash(q.q));
        count++;
      }
    });
  }
  assert.equal(count, 270);
});

test('all four legacy questions migrate to questions that exist', () => {
  const { Q } = chapter6();
  const all = Object.values(Q).flatMap(track => Object.values(track).flat());
  const { aliases } = reviewContext();
  assert.equal(aliases.length, 4);
  for (const [oldText, newText] of aliases) {
    assert.equal(all.filter(q => q.q === oldText).length, 0);
    assert.equal(all.filter(q => q.q === newText).length, 1);
  }
});

test('migration preserves stages, dates, other chapters and unrelated storage', () => {
  const first = reviewContext();
  const ch6 = { untouched: { s: 2, due: '2027-02-03' } };
  const ch7 = {};
  first.aliases.forEach(([oldText], i) => {
    ch6[first.qhash(oldText)] = { s: i % 3, due: '2026-11-' + (20 + i) };
    ch7[first.qhash(oldText)] = { s: 2, due: '2027-01-01' };
  });
  const initial = {
    rg67_review_v1: JSON.stringify({ ch6, ch7 }),
    rg67_trophies_v1: JSON.stringify({ earned: { master: true, 'ch6-own-beginner': true }, stats: { cards: 47 } }),
    rg67_stats_v1: JSON.stringify({ ch6: { UQ: { c: 10, w: 3 } } }),
    rg67_gate_v1: 'synthetic-test-auth-state',
    rg67_streak_v1: JSON.stringify({ last: '2026-11-18', n: 14 })
  };
  const c = reviewContext(initial);
  const result = plain(c.Rev.load());
  c.aliases.forEach(([oldText, newText], i) => {
    assert.ok(!(c.qhash(oldText) in result.ch6));
    assert.deepEqual(result.ch6[c.qhash(newText)], { s: i % 3, due: '2026-11-' + (20 + i) });
  });
  assert.deepEqual(result.ch6.untouched, ch6.untouched);
  assert.deepEqual(result.ch7, ch7);
  for (const [key, value] of Object.entries(initial)) {
    if (key !== 'rg67_review_v1') assert.equal(c.values.get(key), value);
  }
  assert.equal(c.writeCount(), 1);
  assert.deepEqual(plain(c.Rev.load()), result);
  assert.equal(c.writeCount(), 1, 'second load must not rewrite data');
});

test('overlapping old and new records retain the earlier review and lower stage', () => {
  const c = reviewContext();
  const [oldText, newText] = c.aliases[0];
  const data = { ch6: {
    [c.qhash(oldText)]: { s: 0, due: '2026-11-19', oldMetadata: true },
    [c.qhash(newText)]: { s: 2, due: '2026-11-25', newMetadata: true }
  } };
  assert.equal(c.migrateReview20261118(data), true);
  assert.deepEqual(plain(data.ch6[c.qhash(newText)]), {
    s: 0, due: '2026-11-19', oldMetadata: true, newMetadata: true
  });
  assert.equal(c.migrateReview20261118(data), false);
});

test('a storage write failure still returns migrated review records', () => {
  const first = reviewContext();
  const [oldText, newText] = first.aliases[0];
  const c = reviewContext({ rg67_review_v1: JSON.stringify({ ch6: {
    [first.qhash(oldText)]: { s: 1, due: '2026-11-19' }
  } }) }, true);
  assert.deepEqual(plain(c.Rev.load().ch6[c.qhash(newText)]), { s: 1, due: '2026-11-19' });
});

test('due reviews are found under the updated questions after migration', () => {
  const first = reviewContext();
  const ch6 = {};
  first.aliases.forEach(([oldText]) => { ch6[first.qhash(oldText)] = { s: 0, due: '2026-11-17' }; });
  const c = reviewContext({ rg67_review_v1: JSON.stringify({ ch6 }) });
  c.Rev.now = () => new Date('2026-11-18T12:00:00');
  const { Q } = chapter6();
  const all = Object.values(Q).flatMap(track => Object.values(track).flat());
  const due = c.Rev.dueList('ch6', all);
  assert.equal(due.length, 4);
  assert.deepEqual(plain(due.map(q => q.q).sort()), c.aliases.map(pair => pair[1]).sort());
  assert.equal(Object.keys(c.Rev.load().ch6).length, 4);
});

test('no legacy records means no storage writes', () => {
  const data = { ch6: { existing: { s: 1, due: '2026-12-01' } }, ch7: {} };
  const c = reviewContext({ rg67_review_v1: JSON.stringify(data) });
  assert.deepEqual(plain(c.Rev.load()), data);
  assert.equal(c.writeCount(), 0);
});
