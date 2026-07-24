/* End-to-end tests for the training-week app.
   Run with `npm test`. Drives the real page in Chromium and asserts on
   behaviour, so a regression fails the run instead of just printing.

   The app is date-sensitive (today's card, rest days completing by date,
   the Monday reset), so most cases pin the clock to a known day. */
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

let browser;

/* Fresh context per case: own clock, own localStorage. */
async function withPage(opts, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ...opts.context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  if (opts.date) await page.clock.install({ time: new Date(opts.date) });
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  if (opts.seed) await page.evaluate(opts.seed);
  await page.reload();
  await page.waitForTimeout(350);
  try {
    await fn(page);
    check('no console/page errors', errors, []);
  } finally {
    await ctx.close();
  }
}

async function test(name, opts, fn) {
  current = name;
  try {
    await withPage(opts, fn);
  } catch (e) {
    failures.push(`${name} → threw\n      ${e.message.split('\n')[0]}`);
  }
}

/* Seeds run in the page before reload; they recompute day/week numbers the
   same way the app does so they line up with the pinned clock. */
const seedHelpers = `
  const d = new Date();
  const dn = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  const ew = Math.floor((dn + 3) / 7);
  const monday = 7 * ew - 3;
`;

async function completeDay(page, id) {
  await page.click(`#${id} .day-check`);
  await page.waitForTimeout(120);
}

/* Clearing a completed day is arm-then-confirm. */
async function clearDay(page, id) {
  await page.click(`#${id} .day-check`);
  await page.waitForTimeout(120);
  await page.click(`#${id} .day-check`);
  await page.waitForTimeout(150);
}

async function main() {
  browser = await chromium.launch({ executablePath: findChromium() });

  // ---------------------------------------------------------------- week view
  await test('week view: today, rest days, check-off', { date: '2026-07-23T09:00:00' }, async (page) => {
    // Thursday
    check('today card', await page.locator('.day.today').evaluateAll((e) => e.map((x) => x.id)), ['d-thu']);
    // Tuesday has passed -> auto-complete; Friday has not
    check('past rest day closed', await page.locator('#d-tue.closed').count(), 1);
    check('future rest day open', await page.locator('#d-fri.closed').count(), 0);
    check('rest day has no tap target', await page.getAttribute('#d-tue .day-check', 'aria-hidden'), 'true');

    await completeDay(page, 'd-mon');
    check('day collapses', await page.locator('#d-mon.closed').count(), 1);
    check('all sets filled', await page.locator('#d-mon .pip.filled').count(), 18);
    check('nav chip marked', await page.locator('.daynav a[href="#d-mon"].complete').count(), 1);

    // header tap peeks it open again
    await page.click('#d-mon .day-name');
    await page.waitForTimeout(300);
    check('peek open', await page.locator('[data-id="mon-1"]').isVisible(), true);
  });

  await test('confirm before clearing a completed day', { date: '2026-07-23T09:00:00' }, async (page) => {
    await completeDay(page, 'd-mon');
    await page.click('#d-mon .day-name'); // peek open
    await page.waitForTimeout(300);

    await page.click('#d-mon .day-check'); // arm only
    await page.waitForTimeout(120);
    check('armed, nothing cleared', await page.locator('#d-mon .pip.filled').count(), 18);
    check('warning shown', await page.locator('#d-mon .day-check.warn').count(), 1);
    check('warning label', (await page.textContent('#d-mon .day-check-tip')).trim(), 'Tap again to undo');

    await page.click('#d-mon .day-check'); // confirm
    await page.waitForTimeout(200);
    check('cleared on confirm', await page.locator('#d-mon .pip.filled').count(), 0);

    // arming then waiting out the window cancels
    await completeDay(page, 'd-mon');
    await page.click('#d-mon .day-name');
    await page.waitForTimeout(300);
    await page.click('#d-mon .day-check');
    await page.waitForTimeout(120);
    await page.clock.fastForward(4500);
    await page.waitForTimeout(150);
    check('warning expires', await page.locator('#d-mon .day-check.warn').count(), 0);
    check('nothing cleared on expiry', await page.locator('#d-mon .pip.filled').count(), 18);
  });

  // ------------------------------------------------------------------ weights
  await test('weights, reps, variants and progression hints', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('variant choices', await page.locator('.wt-var button').allTextContents(), ['Leg press', 'Goblet squat']);

    await page.fill('.wt-panel input[type="number"]', '100');
    await page.waitForTimeout(120);
    await page.click('.wt-var button[data-v="1"]'); // Goblet squat keeps its own history
    await page.waitForTimeout(150);
    check('other variant starts empty', await page.inputValue('.wt-panel input[type="number"]'), '');
    await page.fill('.wt-panel input[type="number"]', '30');
    await page.waitForTimeout(120);
    await page.click('.wt-var button[data-v="0"]');
    await page.waitForTimeout(150);
    check('first variant remembered', await page.inputValue('.wt-panel input[type="number"]'), '100');

    // log all four sets at the top of the 6-8 range
    for (let i = 0; i < 4; i++) {
      const b = page.locator(`.wt-panel .wt-rep[data-i="${i}"]`);
      await b.click(); await b.click(); await b.click();
    }
    await page.waitForTimeout(150);
    check('rep picker at top', await page.textContent('.wt-panel .wt-rep[data-i="0"]'), '8');
    check('progression hint', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'All sets at 8 — load 102.5 kg next week.');
    check('reps in history', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,8'), true);

    await page.click('.wt-panel .wt-close');
    check('chip shows load', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '100');
  });

  await test('PR flash fires once, and not again after reload', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {},
        wt: { 'mon-1': [{ ew: ew - 1, w: 100 }] },
      }));
    `) }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('last week is the target', (await page.textContent('.wt-panel [data-hint]')).trim(), '');
    await page.click('.wt-panel .wt-step[data-step="2.5"]'); // 102.5 beats the 100 best
    await page.waitForTimeout(250);
    check('PR tag shown', await page.locator('.wt-panel .wt-pr').count(), 1);
    check('chip trend up', (await page.textContent('[data-id="mon-1"] .wt .wt-trend')).trim(), '▲');

    await page.reload();
    await page.waitForTimeout(350);
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel input[type="number"]', '102.5');
    await page.waitForTimeout(250);
    check('PR does not re-fire', await page.locator('.wt-panel .wt-pr').count(), 0);
  });

  // --------------------------------------------------------------- body + log
  await test('body weight and body fat logging', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('#tab-progress');
    await page.waitForTimeout(300);
    check('body section first', (await page.textContent('.pg-day h2')).includes('Body'), true);

    await page.fill('#bw-w', '92.4');
    await page.fill('#bw-bf', '22.8');
    await page.click('#bw-save');
    await page.waitForTimeout(250);
    check('weight recorded', (await page.textContent('.pg-day .chart-card .cc-now')).trim(), '92.4 kg');
    check('body fat card appears', await page.locator('.chart-card', { hasText: 'Body fat' }).count(), 1);
  });

  await test('backup exports and restores everything', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel input[type="number"]', '85');
    await page.waitForTimeout(120);
    await page.click('.wt-panel .wt-close');

    await page.click('#backup-btn');
    await page.waitForTimeout(150);
    const blob = await page.inputValue('#bk-text');
    check('blob looks right', blob.includes('sams-training-week') && blob.includes('mon-1'), true);
    await page.click('#bk-close');

    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(350);
    check('wiped', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '+');

    await page.click('#backup-btn');
    await page.fill('#bk-text', blob);
    await page.click('#bk-restore'); // arm
    await page.click('#bk-restore'); // confirm
    await page.waitForTimeout(300);
    check('restored', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '85');

    await page.click('#backup-btn');
    await page.fill('#bk-text', 'not a backup');
    await page.click('#bk-restore');
    check('bad paste is rejected', await page.locator('.bk-note.err').count(), 1);
  });

  // ------------------------------------------------------- week completion
  await test('week completes without the optional Sunday walk', { date: '2026-08-01T09:00:00' }, async (page) => {
    // Saturday: Tue and Fri already auto-complete, so the four sessions are all that remain
    for (const id of ['d-mon', 'd-wed', 'd-thu']) await completeDay(page, id);
    check('not done yet', await page.locator('#celebrate').isHidden(), true);

    await completeDay(page, 'd-sat');
    await page.waitForTimeout(300);
    check('celebrates on the last session', await page.locator('#celebrate').isVisible(), true);
    check('Sunday still untouched', await page.locator('#d-sun .pip.filled').count(), 0);

    await page.click('#cel-close');
    await page.waitForTimeout(150);
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('streak counts the week', (await page.textContent('.hist-streak')).trim(), 'streak · 1 wk');
    check('roll-up counts sessions', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('4/4 sessions'), true);
  });

  await test('logging Sunday adds it as a bonus', { date: '2026-08-02T09:00:00' }, async (page) => {
    for (const id of ['d-mon', 'd-wed', 'd-thu', 'd-sat']) await completeDay(page, id);
    await page.waitForTimeout(250);
    await page.click('#cel-close');
    await completeDay(page, 'd-sun');
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('bonus shown', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('+Sun walk'), true);
  });

  // ------------------------------------------------------------------ history
  await test('history calendar renders past weeks', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const prev = monday - 7;
      const daysDone = {};
      [0, 2, 3, 5].forEach(o => daysDone[prev + o] = 1);
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone, backfilled: 1,
      }));
    `) }, async (page) => {
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('month title', (await page.textContent('.cal-title')).trim(), 'Jul 2026');
    check('trained days marked', await page.locator('.cal-cell.c-done').count(), 3); // Mon, Thu, Sat
    check('game night marked', await page.locator('.cal-cell.c-ball').count(), 1);
    check('today ringed', await page.locator('.cal-cell.c-today').count(), 1);
    check('streak from day log', (await page.textContent('.hist-streak')).trim(), 'streak · 1 wk');
    check('day nav hidden here', await page.locator('.daynav').isHidden(), true);
  });

  await test('past days can be logged retroactively', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const prev = monday - 7;
      const daysDone = {};
      [0, 2, 3].forEach(o => daysDone[prev + o] = 1);   // Saturday missing
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone, backfilled: 1,
      }));
    `) }, async (page) => {
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('incomplete week, no streak', await page.locator('.hist-streak').count(), 0);
    check('roll-up shows the gap', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('3/4 sessions'), true);

    // the missed Saturday is editable; this week's days are not
    const missing = await page.evaluate(() => {
      const d = new Date();
      const dn = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
      const ew = Math.floor((dn + 3) / 7);
      return 7 * ew - 3 - 7 + 5;
    });
    check('past day is tappable', await page.locator(`.c-edit[data-dn="${missing}"]`).count(), 1);
    check('this week is not tappable', await page.locator('.c-edit').evaluateAll(
      (els, m) => els.every((e) => +e.dataset.dn <= m), missing + 1), true);

    await page.click(`.c-edit[data-dn="${missing}"]`);
    await page.waitForTimeout(250);
    check('day now counted', await page.locator(`.c-edit[data-dn="${missing}"][aria-pressed="true"]`).count(), 1);
    check('streak repaired', (await page.textContent('.hist-streak')).trim(), 'streak · 1 wk');
    check('roll-up updated', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('4/4 sessions'), true);

    // removing it again needs a confirm
    await page.click(`.c-edit[data-dn="${missing}"]`);
    await page.waitForTimeout(150);
    check('remove is armed first', await page.locator(`.c-edit[data-dn="${missing}"][aria-pressed="true"]`).count(), 1);
    await page.click(`.c-edit[data-dn="${missing}"]`);
    await page.waitForTimeout(250);
    check('removed on confirm', await page.locator(`.c-edit[data-dn="${missing}"][aria-pressed="false"]`).count(), 1);
  });

  await test('game effort is recorded per week', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('#game-fx .fx-btn[data-e="2"]');
    check('high selected', await page.locator('#game-fx .fx-btn[data-e="2"].on').count(), 1);
    await page.reload();
    await page.waitForTimeout(350);
    check('survives reload', await page.locator('#game-fx .fx-btn[data-e="2"].on').count(), 1);
    await page.click('#game-fx .fx-btn[data-e="2"]');
    check('tapping again clears', await page.locator('#game-fx .fx-btn.on').count(), 0);

    await page.click('#game-fx .fx-btn[data-e="1"]');
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('shows in roll-up', (await page.textContent('.wk-lines')).includes('game med'), true);
  });

  // --------------------------------------------------------------- rest timer
  await test('rest timer runs, extends and can be turned off', { date: '2026-07-23T09:00:00' }, async (page) => {
    check('hidden at rest', await page.locator('#rest-bar').isHidden(), true);

    await page.click('[data-id="thu-1"] .ex'); // log a working set
    await page.waitForTimeout(150);
    check('bar appears', await page.locator('#rest-bar').isVisible(), true);
    check('starts at default', await page.textContent('#rb-time'), '2:30');

    await page.clock.fastForward(60000);
    await page.waitForTimeout(100);
    check('counts down', await page.textContent('#rb-time'), '1:30');

    await page.click('#rb-plus');
    await page.waitForTimeout(100);
    check('+30s extends', await page.textContent('#rb-time'), '2:00');

    await page.clock.fastForward(125000);
    await page.waitForTimeout(150);
    check('reaches zero', await page.textContent('#rb-time'), '0:00');
    check('signals go', (await page.textContent('#rest-bar .rb-lab')).trim(), 'Go');

    // the fixed bar must not sit on top of the footer controls
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const prefBox = await page.locator('#pref-rest').boundingBox();
    const barBox = await page.locator('#rest-bar').boundingBox();
    check('footer clears the bar', prefBox.y + prefBox.height <= barBox.y, true);

    await page.click('#rb-stop');
    check('dismissable', await page.locator('#rest-bar').isHidden(), true);

    // a zone-2 finisher is not a working set
    await page.click('[data-id="thu-6"] .ex');
    await page.waitForTimeout(150);
    check('no timer after a walk', await page.locator('#rest-bar').isHidden(), true);

    // and it can be switched off entirely
    await page.click('#pref-rest');
    await page.click('[data-id="thu-2"] .ex');
    await page.waitForTimeout(150);
    check('off means off', await page.locator('#rest-bar').isHidden(), true);
    await page.reload();
    await page.waitForTimeout(350);
    check('preference persists', await page.getAttribute('#pref-rest', 'aria-pressed'), 'false');
  });

  // ------------------------------------------------------------------- resets
  await test('reset clears the week but keeps history', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel input[type="number"]', '90');
    await page.waitForTimeout(120);
    await page.click('.wt-panel .wt-close');
    await completeDay(page, 'd-mon');

    await page.click('#reset-btn');
    check('reset is armed first', (await page.textContent('#reset-btn')).trim(), 'Sure? Tap again');
    await page.click('#reset-btn');
    await page.waitForTimeout(250);
    check('sets cleared', await page.locator('.pip.filled').count(), 0);
    check('weight kept', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '90');
  });

  await test('a new week resets sets and keeps weights', { date: '2026-07-23T09:00:00' }, async (page) => {
    await completeDay(page, 'd-mon');
    await page.click('#d-mon .day-name');
    await page.waitForTimeout(300);
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel input[type="number"]', '75');
    await page.waitForTimeout(120);
    await page.click('.wt-panel .wt-close');

    // roll the clock forward a week the way real time would: the stored week
    // goes stale and the logged weight becomes last week's
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('sams-training-week'));
      s.week = '2026-W01';
      localStorage.setItem('sams-training-week', JSON.stringify(s));
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      w.wt['mon-1'].forEach((e) => { e.ew -= 1; });
      localStorage.setItem('sams-training-weights', JSON.stringify(w));
    });
    await page.reload();
    await page.waitForTimeout(350);
    check('sets reset', await page.locator('.pip.filled').count(), 0);
    check('weight carried over as the target', await page.locator('[data-id="mon-1"] .wt.is-prev').count(), 1);
    check('target value', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '75');
  });

  await browser.close();

  console.log(`\n${pass} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('All checks passed.');
}

main().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});
