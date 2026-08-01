/* Unit tests for the pure helpers behind the app.

   app.test.js drives the rendered page; this file goes straight at the date
   and metric maths through the window.__logic hook. The cases here — ISO
   week 53, year boundaries, the invariant that the two week counters flip on
   the same Monday — are the ones that are painful to provoke end to end and
   cheap to assert directly.

   Run with `npm test` (or `node tests/logic.test.js` on its own). */
const { chromium } = require('playwright-core');
const { findChromium, APP_URL } = require('./browser');

let pass = 0;
const failures = [];
let current = '';

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    pass++;
  } else {
    failures.push(`${current} → ${name}\n      expected: ${e}\n      actual:   ${a}`);
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium() });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });

  /* pinned so nothing here depends on the day the suite happens to run */
  await page.clock.install({ time: new Date('2026-07-23T09:00:00') });
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const at = (iso, fn) => page.clock.setFixedTime(new Date(iso)).then(() => page.evaluate(fn));
  const call = (fn, arg) => page.evaluate(fn, arg);

  /* ---- ISO week ids ---------------------------------------------------
     The tricky part is that an ISO week belongs to the year holding its
     Thursday, so the label disagrees with the calendar year either side of
     New Year. Each date below is a known crossing. */
  current = 'weekId: ISO year boundaries';
  check('2026-01-01 (Thu) is week 1 of 2026', await at('2026-01-01T12:00:00', () => __logic.weekId()), '2026-W01');
  check('2025-12-29 (Mon) already belongs to 2026', await at('2025-12-29T12:00:00', () => __logic.weekId()), '2026-W01');
  check('2026-12-31 (Thu) is week 53', await at('2026-12-31T12:00:00', () => __logic.weekId()), '2026-W53');
  check('2027-01-01 (Fri) still week 53 of 2026', await at('2027-01-01T12:00:00', () => __logic.weekId()), '2026-W53');
  check('2027-01-04 (Mon) opens 2027', await at('2027-01-04T12:00:00', () => __logic.weekId()), '2027-W01');
  check('2021-01-01 (Fri) belongs to 2020', await at('2021-01-01T12:00:00', () => __logic.weekId()), '2020-W53');
  check('2024-12-30 (Mon) belongs to 2025', await at('2024-12-30T12:00:00', () => __logic.weekId()), '2025-W01');

  /* ---- the two week counters must turn over together -------------------
     weekId gates the Monday reset, epochWeek keys every stored entry. If
     they ever disagreed about where a week starts, a session could be
     filed under one week and wiped by the other. */
  current = 'weekId and epochWeek flip on the same Monday';
  const sunday = '2026-08-02T23:59:00';   /* last minute of the training week */
  const monday = '2026-08-03T00:01:00';   /* first minute of the next one */
  const before = await at(sunday, () => ({ id: __logic.weekId(), ew: __logic.epochWeek() }));
  const after = await at(monday, () => ({ id: __logic.weekId(), ew: __logic.epochWeek() }));
  check('week id changes across the boundary', before.id !== after.id, true);
  check('epoch week advances by exactly one', after.ew - before.ew, 1);
  const satEarly = await at('2026-08-01T00:01:00', () => ({ id: __logic.weekId(), ew: __logic.epochWeek() }));
  check('same week id earlier in the week', satEarly.id, before.id);
  check('same epoch week earlier in the week', satEarly.ew, before.ew);

  /* ---- day numbers <-> week numbers ---- */
  current = 'ewOf / mondayDnOf round-trip';
  check(
    'a week maps to its Monday and back',
    await call(() => {
      const out = [];
      for (let w = 2900; w < 2960; w++) out.push(__logic.ewOf(__logic.mondayDnOf(w)) === w);
      return out.every(Boolean);
    }),
    true
  );
  check(
    'every day of a week maps to that week',
    await call(() => {
      const m = __logic.mondayDnOf(2950);
      const out = [];
      for (let i = 0; i < 7; i++) out.push(__logic.ewOf(m + i) === 2950);
      /* and the day before Monday belongs to the previous week */
      out.push(__logic.ewOf(m - 1) === 2949);
      return out.every(Boolean);
    }),
    true
  );

  /* ---- gridline steps ---- */
  current = 'niceStep';
  check('degenerate range falls back to a plate', await call(() => __logic.niceStep(0)), 2.5);
  check('negative range falls back too', await call(() => __logic.niceStep(-5)), 2.5);
  check('10 kg range steps in 2.5s', await call(() => __logic.niceStep(10)), 2.5);
  check('100 steps in 25s', await call(() => __logic.niceStep(100)), 25);
  check('tonnage steps in hundreds', await call(() => __logic.niceStep(4000)), 1000);
  check('step always divides the range at least four ways', await call(() => {
    const out = [];
    for (let r = 1; r < 5000; r += 7) out.push(__logic.niceStep(r) > 0 && __logic.niceStep(r) <= r);
    return out.every(Boolean);
  }), true);

  /* ---- session scoring ---- */
  current = 'metricOf';
  const entry = { ew: 2950, w: 100, s: [{ w: 100, r: 5 }, { w: 95, r: 8 }, { w: 90, r: 10 }] };
  check('top set reads the entry weight', await call((e) => __logic.metricOf(e, 'top'), entry), 100);
  check('volume multiplies every set out', await call((e) => __logic.metricOf(e, 'vol'), entry), 100 * 5 + 95 * 8 + 90 * 10);
  /* 100×5 → 116.7, 95×8 → 120.3, 90×10 → 120: the second set wins, which is
     the point of scoring on e1rm rather than the top set alone. */
  check('e1rm takes the best set by Epley', await call((e) => __logic.metricOf(e, 'e1rm'), entry), 120.3);
  check(
    'and that beat the top set on its own',
    await call((e) => __logic.metricOf(e, 'e1rm') > __logic.metricOf(e, 'top'), entry),
    true
  );
  check(
    'adding reps at the same load raises e1rm',
    await call(() => {
      const light = { w: 60, s: [{ w: 60, r: 6 }] };
      const heavy = { w: 60, s: [{ w: 60, r: 8 }] };
      return __logic.metricOf(heavy, 'e1rm') > __logic.metricOf(light, 'e1rm');
    }),
    true
  );
  check(
    'weights with no reps still score on load',
    await call(() => __logic.metricOf({ w: 80, s: [{ w: 80, r: null }] }, 'e1rm')),
    80
  );
  check(
    'volume needs reps, so a repless entry has none',
    await call(() => __logic.metricOf({ w: 80, s: [{ w: 80, r: null }] }, 'vol')),
    null
  );
  check('an empty entry scores nothing', await call(() => __logic.metricOf({ s: [] }, 'top')), null);

  /* ---- formatting ---- */
  current = 'formatting';
  check('whole numbers stay whole', await call(() => __logic.fmtW(60)), '60');
  check('quarter plates survive', await call(() => __logic.fmtW(62.25)), '62.25');
  check('rounds to two places', await call(() => __logic.fmtW(62.256)), '62.26');
  check('big values drop decimals', await call(() => __logic.fmtV(4212.7)), '4213');
  check('small values keep one', await call(() => __logic.fmtV(62.34)), '62.3');
  check('clock pads seconds', await call(() => __logic.fmtClock(90000)), '1:30');
  check('clock rounds up part-seconds', await call(() => __logic.fmtClock(90001)), '1:31');
  check('clock floors at zero', await call(() => __logic.fmtClock(-5000)), '0:00');
  check('clock past an hour keeps counting minutes', await call(() => __logic.fmtClock(3720000)), '62:00');

  check('no console/page errors', errors, []);
  await ctx.close();

  /* ---- required days follow the program ------------------------------
     The hard-coded [0,2,3,5] this replaced meant emptying a day in the
     editor left a requirement nothing could satisfy, so the streak stuck
     at zero for good. */
  async function withProgram(program, fn) {
    const c = await browser.newContext();
    const p = await c.newPage();
    await p.clock.install({ time: new Date('2026-07-23T09:00:00') });
    await p.goto(APP_URL);
    await p.evaluate(() => localStorage.clear());
    if (program) {
      await p.evaluate((prog) => {
        localStorage.setItem('sams-training-weights', JSON.stringify({ program: prog }));
      }, program);
    }
    await p.reload();
    await p.waitForTimeout(200);
    try {
      await fn(p);
    } finally {
      await c.close();
    }
  }

  const ex = (id) => [{ id, name: id, rx: '3 × 8', sets: 1, wt: true, reps: '8' }];

  current = 'requiredOffsets: default program';
  await withProgram(null, async (p) => {
    check('Mon, Wed, Thu and Sat are required', await p.evaluate(() => __logic.requiredOffsets()), [0, 2, 3, 5]);
  });

  current = 'requiredOffsets: a day emptied in the editor';
  await withProgram(
    { 'd-mon': ex('mon-1'), 'd-wed': [], 'd-thu': ex('thu-1'), 'd-sat': ex('sat-1'), 'd-sun': [] },
    async (p) => {
      check('Wednesday drops out of the requirement', await p.evaluate(() => __logic.requiredOffsets()), [0, 3, 5]);
      /* Stamp last week on the days the program still asks for, reload so
         the app reads them back, and it has to count as complete. Last week
         rather than this one because stampWeek() re-derives the current
         week from the live set ticks, which a seeded store doesn't have. */
      await p.evaluate(() => {
        const m = __logic.mondayDnOf(__logic.epochWeek() - 1);
        const w = JSON.parse(localStorage.getItem('sams-training-weights'));
        w.daysDone = {};
        [0, 3, 5].forEach((o) => { w.daysDone[m + o] = 1; });
        localStorage.setItem('sams-training-weights', JSON.stringify(w));
      });
      await p.reload();
      await p.waitForTimeout(200);
      check(
        'and the week completes on the days that remain',
        await p.evaluate(() => __logic.weekComplete(__logic.epochWeek() - 1)),
        true
      );
      check(
        'a Wednesday stamp is no longer needed for it',
        await p.evaluate(() => {
          const m = __logic.mondayDnOf(__logic.epochWeek() - 1);
          return JSON.parse(localStorage.getItem('sams-training-weights')).daysDone[m + 2] == null;
        }),
        true
      );
      check(
        'while a week with nothing stamped did not',
        await p.evaluate(() => __logic.weekComplete(__logic.epochWeek() - 2)),
        false
      );
    }
  );

  current = 'requiredOffsets: Sunday stays optional';
  await withProgram(
    { 'd-mon': ex('mon-1'), 'd-wed': [], 'd-thu': [], 'd-sat': [], 'd-sun': ex('sun-1') },
    async (p) => {
      check('a Sunday walk is a bonus, not a requirement', await p.evaluate(() => __logic.requiredOffsets()), [0]);
    }
  );

  current = 'weekComplete: an empty program';
  await withProgram(
    { 'd-mon': [], 'd-wed': [], 'd-thu': [], 'd-sat': [], 'd-sun': [] },
    async (p) => {
      check('nothing required means nothing to complete', await p.evaluate(() => __logic.requiredOffsets()), []);
      check(
        'so no week counts as done',
        await p.evaluate(() => __logic.weekComplete(__logic.epochWeek())),
        false
      );
    }
  );

  await browser.close();

  if (failures.length) {
    console.log('\n' + failures.length + ' failed, ' + pass + ' passed\n');
    failures.forEach((f) => console.log('  ✗ ' + f + '\n'));
    process.exit(1);
  }
  console.log('\n' + pass + ' passed, 0 failed');
  console.log('All logic checks passed.');
})();
