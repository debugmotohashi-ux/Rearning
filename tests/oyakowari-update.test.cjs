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

function chapter6(now = "2026-11-25T12:00:00+09:00") {
  const start = source.indexOf('window.CH6=(function(){');
  const end = source.indexOf('window.CH7=(function(){');
  const code = source.slice(start, end).replace(
    'return {init:init, html:CH6_HTML};',
    'return {init:init, html:CH6_HTML, Q:Q, PLANS:PLANS, OTHERS:OTHERS};'
  );
  const context = { window: {}, Date: class extends Date { static now() { return Date.parse(now); } } };
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

test('UQ family eligibility is consistent in the app cards and answer', () => {
  const { Q, PLANS, OTHERS } = chapter6();
  const komikomi = PLANS.find(p => p.name === 'コミコミプランバリュー');
  const family = PLANS.find(p => p.name === 'UQ親子応援割｜対象・家族条件');
  assert.ok(komikomi);
  for (const copy of [komikomi.spec['セット割'], family.spec['家族']]) {
    assert.match(copy, /自宅セット割または家族セット割/);
  }
  assert.match(family.spec['家族'], /回線ごと.*申込み/);
  assert.match(family.detail, /ouenwari\.pdf/);
  const q = Object.values(Q.own).flat().find(q => q.q.includes('コミコミの大人回線にも適用'));
  assert.match(q.o[q.a], /自宅セット割または家族セット割/);
  assert.match(q.o[q.a], /家族回線ごと/);
  const y = OTHERS.carriers.find(o => o.br === 'ワイモバ');
  assert.match(y.warn, /申込順序、適用後のプラン変更・子ども回線離脱、超！おトク割との併用は確認待ち/);
});

test('ahamo card and quizzes switch exactly at 12/1 00:00 JST, with no duplicate review keys', () => {
  const nov = chapter6('2026-11-30T14:59:59.999Z');
  const dec = chapter6('2026-11-30T15:00:00.000Z');
  const card = ({ OTHERS }) => OTHERS.carriers.flatMap(o => o.plans || []).find(p => p.n === 'ahamo');
  assert.match(card(nov).p, /2,970円/);
  assert.match(card(nov).note, /12\/1から.*予告/);
  assert.match(card(dec).p, /3,135円.*4,125円.*5,115円/);
  assert.match(card(dec).note, /海外.*最大40GB.*24時間980円/);
  const all = ({ Q }) => Object.values(Q).flatMap(track => Object.values(track).flat());
  const novSet = all(nov);
  const decSet = all(dec);
  const newComparison = decSet.find(q => q.q.includes('ahamoとLINEMOベストプランVに共通する'));
  assert.match(newComparison.o[newComparison.a], /5分以内の国内通話込み/);
  assert.ok(!novSet.some(q => q.q === newComparison.q));
  assert.ok(!decSet.some(q => q.q.includes('30GB・2,970円・5分国内通話込み')));
  const { qhash } = reviewContext();
  assert.equal(new Set(decSet.map(q => qhash(q.q))).size, 270);
  for (const q of decSet) assert.ok(q.o.length === 4 && typeof q.o[q.a] === 'string');
  assert.match(fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8'), /v8-ahamo-oyakowari/);
});

test('old ahamo review is kept but does not surface a stale answer after cutover', () => {
  const oldText = 'ahamoの基本データ容量として正しいものはどれですか？';
  const { qhash } = reviewContext();
  const entry = { s: 1, due: '2026-11-25' };
  const c = reviewContext({ rg67_review_v1: JSON.stringify({ ch6: { [qhash(oldText)]: entry } }) });
  const all = ({ Q }) => Object.values(Q).flatMap(track => Object.values(track).flat());
  c.Rev.now = () => new Date('2026-11-30T12:00:00');
  assert.equal(c.Rev.dueList('ch6', all(chapter6())).map(q => q.q).join(), oldText);
  c.Rev.now = () => new Date('2026-12-01T12:00:00');
  assert.equal(c.Rev.dueList('ch6', all(chapter6('2026-12-01T00:00:00+09:00'))).length, 0);
  assert.deepEqual(plain(c.Rev.load().ch6[qhash(oldText)]), entry);
  assert.equal(c.writeCount(), 0);
});
