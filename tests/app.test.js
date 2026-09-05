/* End-to-end tests for the training-week app.
   Run with `npm test`. Drives the real page in Chromium and asserts on
   behaviour, so a regression fails the run instead of just printing.

   The app is date-sensitive (today's card, rest days completing by date,
   a week rolling into the next), so most cases pin the clock to a known
   day. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { findChromium, APP_URL } = require('./browser');
const ROOT = path.resolve(__dirname, '..');

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
  if (process.env.TEST_FILTER && !name.includes(process.env.TEST_FILTER)) return;
  current = name;
  const before = failures.length;
  try {
    await withPage(opts, fn);
  } catch (e) {
    failures.push(`${name} → threw\n      ${e.message.split('\n')[0]}`);
  }
  console.log(`${failures.length === before ? 'PASS' : 'FAIL'} ${name}`);
  failures.slice(before).forEach((f) => console.log(f));
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

/* Effort is one tap per set — E, M, H — and tapping the lit one clears it. */
async function rate(page, set, e) {
  await page.click(`.wt-panel .wt-set:nth-child(${set}) .wt-fxb[data-e="${e}"]`);
  await page.waitForTimeout(120);
}

/* the effort stored against the latest entry for a lift, one slot per set */
function storedEfforts(page, key) {
  return page.evaluate((k) => {
    const es = JSON.parse(localStorage.getItem('sams-training-weights')).wt[k] || [];
    const last = es[es.length - 1];
    return last ? last.s.map((s) => (s.e == null ? null : s.e)) : null;
  }, key);
}

/* Sets are ticked off inside the exercise panel now: tap the name to open
   it, then the numbered button beside the set you just finished. */
async function openRow(page, id) {
  if (!(await page.locator(`[data-id="${id}"][aria-expanded="true"]`).count())) {
    await page.click(`[data-id="${id}"] .ex`);
    await page.waitForTimeout(150);
  }
}
async function tickSet(page, id, n) {            // n is 1-based
  await openRow(page, id);
  await page.click(`.wt-panel .wt-sdone[data-i="${n - 1}"]`);
  await page.waitForTimeout(120);
}
async function tickAll(page, id) {
  const sets = +(await page.getAttribute(`[data-id="${id}"]`, 'data-sets'));
  for (let n = 1; n <= sets; n++) await tickSet(page, id, n);
}
async function completeDayBySet(page, dayId) {
  const ids = await page.locator(`#${dayId} .row`).evaluateAll((els) => els.map((e) => e.dataset.id));
  for (const id of ids) await tickAll(page, id);
}

/* Clearing a completed day is arm-then-confirm. */
async function clearDay(page, id) {
  await page.click(`#${id} .day-check`);
  await page.waitForTimeout(120);
  await page.click(`#${id} .day-check`);
  await page.waitForTimeout(150);
}

/* Switching tabs scrolls smoothly, so where the page has got to at any fixed
   delay depends on how far it had to travel. Wait for it to stop moving. */
async function settleScroll(page) {
  let last = null;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => scrollY);
    if (y === last) return y;
    last = y;
    await page.waitForTimeout(50);
  }
  return last;
}

/* The installed app's identity lives in three files that have to agree;
   nothing in the running page would reveal them drifting apart. */
function checkInstallIdentity() {
  current = 'install identity';
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const appleTitle = (html.match(/name="apple-mobile-web-app-title" content="([^"]+)"/) || [])[1];

  check('manifest name', manifest.name, 'Longevity');
  check('home-screen label', manifest.short_name, 'Longevity');
  check('iOS home-screen label matches', appleTitle, manifest.short_name);
  check('icons declared', manifest.icons.map((i) => i.sizes), ['192x192', '512x512']);
  check('icons are not maskable', manifest.icons.every((i) => i.purpose === 'any'), true);
  manifest.icons.concat([{ src: 'icons/icon-180.png' }]).forEach((i) => {
    check(i.src + ' exists', fs.existsSync(path.join(ROOT, i.src)), true);
  });
  check('apple-touch-icon points at the 180', html.includes('href="icons/icon-180.png"'), true);
}

async function main() {
  checkInstallIdentity();
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
    check('all sets filled', await page.locator('#d-mon .pip.filled').count(), 20);
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
    check('armed, nothing cleared', await page.locator('#d-mon .pip.filled').count(), 20);
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
    check('nothing cleared on expiry', await page.locator('#d-mon .pip.filled').count(), 20);
  });

  await test('the exercise name opens the exercise, it never logs a set',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    const filled = () => page.locator('[data-id="mon-1"] .pip.filled').count();

    check('nothing is open to start', await page.locator('.wt-panel').count(), 0);
    await page.click('[data-id="mon-1"] .ex');
    await page.waitForTimeout(200);
    check('tapping the name opens it', await page.locator('.wt-panel').count(), 1);
    check('the row says so', await page.getAttribute('[data-id="mon-1"]', 'aria-expanded'), 'true');
    check('and logs nothing on the way', await filled(), 0);

    check('a done control per set', await page.locator('.wt-panel .wt-sdone').count(), 4);
    await page.click('[data-id="mon-1"] .ex');
    await page.waitForTimeout(200);
    check('tapping the name again closes it', await page.locator('.wt-panel').count(), 0);
    check('still nothing logged', await filled(), 0);
  });

  await test('each set is ticked off on its own', { date: '2026-07-23T09:00:00' }, async (page) => {
    const pips = () => page.locator('[data-id="mon-1"] .pip').evaluateAll(
      (els) => els.map((e) => (e.classList.contains('filled') ? 1 : 0)));

    await tickSet(page, 'mon-1', 2);
    check('only the set you ticked fills', await pips(), [0, 1, 0, 0]);
    check('the control shows done', await page.locator('.wt-panel .wt-sdone[data-i="1"].on').count(), 1);
    check('and the rest timer starts with it', await page.locator('#rest-bar').isHidden(), false);

    await tickSet(page, 'mon-1', 4);
    check('sets do not have to be in order', await pips(), [0, 1, 0, 1]);
    check('stored per set', await page.evaluate(
      () => JSON.parse(localStorage.getItem('sams-training-week')).sets['mon-1']), [0, 1, 0, 1]);

    // ticking the same one again takes it back
    await tickSet(page, 'mon-1', 2);
    check('a tick can be taken back', await pips(), [0, 0, 0, 1]);
    check('and the rest it started stops with it', await page.locator('#rest-bar').isHidden(), true);

    await tickSet(page, 'mon-1', 1);
    await tickSet(page, 'mon-1', 2);
    await tickSet(page, 'mon-1', 3);
    check('the row completes on the last one', await page.locator('[data-id="mon-1"].done').count(), 1);
    check('and it survives a reload', await page.reload().then(() => page.waitForTimeout(350)).then(
      () => page.locator('[data-id="mon-1"] .pip.filled').count()), 4);
  });

  await test('lifts that carry no weight get ticks too', { date: '2026-07-23T09:00:00' }, async (page) => {
    // Copenhagen plank: 3 x 20s a side, no load to record
    await page.click('[data-id="mon-5"] .ex');
    await page.waitForTimeout(200);
    check('it opens like any other', await page.locator('.wt-panel').count(), 1);
    check('with a tick per set', await page.locator('.wt-panel .wt-ticks .wt-sdone').count(), 3);
    check('and no weight fields', await page.locator('.wt-panel .wt-sw').count(), 0);

    await page.click('.wt-panel .wt-ticks .wt-sdone[data-i="0"]');
    await page.waitForTimeout(150);
    check('ticking one counts', await page.locator('[data-id="mon-5"] .pip.filled').count(), 1);
  });

  await test('a day completed set by set closes and logs itself',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    await completeDayBySet(page, 'd-thu');
    check('every set is in', await page.locator('#d-thu .pip:not(.filled)').count(), 0);
    check('the day collapses on the last tick', await page.locator('#d-thu.closed').count(), 1);
    check('and the panel closes with it', await page.locator('.wt-panel').count(), 0);
    check('the day reports complete', await page.locator('.daynav a[href="#d-thu"].complete').count(), 1);
    check('and lands in the log', await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      return Object.keys(w.weeks[w.weekNo].done);
    }), ['d-thu']);
  });

  await test('a week stored as plain counts still reads back', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      /* how sets were stored before they became one flag each */
      localStorage.setItem('sams-training-week', JSON.stringify({
        week: ew, sets: { 'mon-1': 3, 'mon-2': 3 }, celebrated: false,
      }));
    `) }, async (page) => {
    check('a partial count fills from the first set',
      await page.locator('[data-id="mon-1"] .pip').evaluateAll(
        (els) => els.map((e) => (e.classList.contains('filled') ? 1 : 0))), [1, 1, 1, 0]);
    check('a finished one still reads finished', await page.locator('[data-id="mon-2"].done').count(), 1);

    // and the first edit rewrites it in the new shape
    await tickSet(page, 'mon-1', 4);
    check('converted on write', await page.evaluate(
      () => JSON.parse(localStorage.getItem('sams-training-week')).sets['mon-1']), [1, 1, 1, 1]);
  });

  // ------------------------------------------------------------------ weights
  await test('weights, reps, variants and progression hints', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('variant choices', await page.locator('.wt-var button').allTextContents(), ['Leg press', 'Goblet squat']);
    check('one row per prescribed set', await page.locator('.wt-panel .wt-set').count(), 4);
    check('reps default to the programmed number',
      await page.locator('.wt-panel .wt-sr').evaluateAll((els) => els.map((e) => e.value)),
      ['8', '8', '8', '8']);

    // one entry levels every set
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);
    check('all sets take the weight',
      await page.locator('.wt-panel .wt-sw').evaluateAll((els) => els.map((e) => e.value)),
      ['100', '100', '100', '100']);
    check('a plan has no progression advice', await page.locator('.wt-panel [data-hint]').isHidden(), true);
    check('a plan is not history', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,8'), false);
    await tickAll(page, 'mon-1');
    check('progression hint', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'All sets at 8 — load 102.5 kg next week.');
    check('reps recorded', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,8'), true);

    // variants keep separate histories
    await page.click('.wt-var button[data-v="1"]');
    await page.waitForTimeout(150);
    check('other variant starts empty', await page.inputValue('.wt-panel .wt-top'), '');
    await page.fill('.wt-panel .wt-top', '30');
    await page.waitForTimeout(150);
    await page.click('.wt-var button[data-v="0"]');
    await page.waitForTimeout(150);
    check('first variant remembered', await page.inputValue('.wt-panel .wt-top'), '100');

    await page.click('.wt-panel .wt-close');
    check('chip shows the top set', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '100');
  });

  await test('sets can carry different weights and reps', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);

    // a lighter back-off set with fewer reps
    await page.fill('.wt-panel .wt-sw[data-i="3"]', '90');
    await page.fill('.wt-panel .wt-sr[data-i="3"]', '6');
    await page.waitForTimeout(150);
    await tickAll(page, 'mon-1');
    check('history shows the spread', (await page.textContent('.wt-panel .wt-hist')).includes('100–90'), true);
    check('history shows per-set reps', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,6'), true);
    check('hint retracts below the range', await page.locator('.wt-panel [data-hint]').isHidden(), true);
    check('chip still shows the top set', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '100');

    // the steppers move every set and keep the gap
    await page.click('.wt-panel .wt-step[data-step="2.5"]');
    await page.waitForTimeout(150);
    check('all sets shift together',
      await page.locator('.wt-panel .wt-sw').evaluateAll((els) => els.map((e) => e.value)),
      ['102.5', '102.5', '102.5', '92.5']);
  });

  await test('Save records the panel as shown', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {},
        wt: { 'mon-2': [{ ew: ew - 1, w: 40, s: [{ w: 40, r: 8 }, { w: 40, r: 8 }, { w: 40, r: 8 }] }] },
      }));
    `) }, async (page) => {
    check('last week shown as the target', await page.locator('[data-id="mon-2"] .wt.is-prev').count(), 1);
    await page.click('[data-id="mon-2"] .wt');
    check('prefilled from last week', await page.inputValue('.wt-panel .wt-top'), '40');
    await page.click('.wt-panel .wt-close');   // repeat last week in one tap
    await page.waitForTimeout(150);
    check('logged for this week', await page.locator('[data-id="mon-2"] .wt.is-set').count(), 1);
    check('same load', (await page.textContent('[data-id="mon-2"] .wt .wt-val')).trim(), '40');
  });

  await test('the lb toggle is gone', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('no unit toggle', await page.locator('.wt-unitbtn').count(), 0);
    check('kg is fixed', await page.textContent('.wt-panel .wt-field span'), 'kg');
  });

  await test('PR flash waits for the sets, then fires once', { date: '2026-07-23T09:00:00',
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
    check('a typed weight alone is not a PR', await page.locator('.wt-panel .wt-pr').count(), 0);
    check('chip trend up', (await page.textContent('[data-id="mon-1"] .wt .wt-trend')).trim(), '▲');

    await tickSet(page, 'mon-1', 1);
    await tickSet(page, 'mon-1', 2);
    await tickSet(page, 'mon-1', 3);
    check('still short of the last set', await page.locator('.wt-panel .wt-pr').count(), 0);
    await tickSet(page, 'mon-1', 4);
    await page.waitForTimeout(250);
    check('PR tag shown once the lift is done', await page.locator('.wt-panel .wt-pr').count(), 1);

    await page.reload();
    await page.waitForTimeout(350);
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '102.5');
    await page.waitForTimeout(250);
    check('PR does not re-fire', await page.locator('.wt-panel .wt-pr').count(), 0);
  });

  await test('finishing every set at last week\'s weight is no PR', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {},
        wt: { 'mon-1': [{ ew: ew - 1, w: 100 }] },
      }));
    `) }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('repeating last week', await page.inputValue('.wt-panel .wt-top'), '100');
    await page.fill('.wt-panel .wt-top', '100');   // logged, same load as last week
    await page.waitForTimeout(200);
    check('session logged at 100', await page.evaluate(() => {
      const es = JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1'];
      return es[es.length - 1].w;
    }), 100);
    await tickAll(page, 'mon-1');
    await page.waitForTimeout(250);
    check('no PR for holding the load', await page.locator('.wt-panel .wt-pr').count(), 0);
    check('and none stored', await page.evaluate(() =>
      Object.keys(JSON.parse(localStorage.getItem('sams-training-weights')).prSeen || {})), []);
  });

  await test('an exercise name is text, never markup', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [{ ew: ew - 1, w: 100, s: [{w:100,r:8}] }, { ew: ew, w: 105, s: [{w:105,r:8}] }] },
        program: { 'd-mon': [{ id: 'mon-1', name: '<img src=x onerror="window.__x=1">Squat',
                               rx: '4 × 8', sets: 4, wt: true, reps: '8' }],
                   'd-wed': [], 'd-thu': [], 'd-sat': [], 'd-sun': [] },
      }));
    `) }, async (page) => {
    await page.click('#tab-progress');
    await page.waitForTimeout(400);
    check('nothing ran', await page.evaluate(() => !!window.__x), false);
    check('nothing was injected', await page.locator('.chart-card img').count(), 0);
    const card = page.locator('.chart-card', { hasText: 'Squat' });
    check('the name reads as written', (await card.locator('.cc-name').textContent()).trim(),
      '<img src=x onerror="window.__x=1">Squat');
  });

  await test('emptying a day retires the session it required', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const one = (id, n) => ({ id, name: n, rx: '1 × 1', sets: 1, wt: true, reps: '8' });
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1, wt: {},
        program: { 'd-mon': [one('mon-1','A')], 'd-wed': [], 'd-thu': [one('thu-1','C')],
                   'd-sat': [one('sat-1','D')], 'd-sun': [] },
      }));
    `) }, async (page) => {
    check('the week asks for three, not four', (await page.textContent('#wb-count')).trim(), '0/3 sessions');
    for (const id of ['mon-1', 'thu-1', 'sat-1']) await tickSet(page, id, 1);

    check('the band completes', (await page.textContent('#wb-count')).trim(), '3/3 sessions');
    // three of three is the whole week: the empty day is not a session to wait on
    await page.waitForTimeout(250);
    check('and the week finishes on them', await page.locator('#celebrate').isVisible(), true);
    await page.click('#cel-next');
    await page.waitForTimeout(200);

    await page.click('#tab-history');
    await page.waitForTimeout(350);
    check('history agrees', (await page.textContent('.wk-lines')).includes('3/3 sessions'), true);
    check('and the streak counts it', await page.locator('.hist-streak').count(), 1);
  });

  await test('the week band tracks progress as you go', { date: '2026-07-23T09:00:00' },
    async (page) => {
    const band = () => page.textContent('#wb-count').then((t) => t.trim());
    check('starts empty', await band(), '0/4 sessions');

    await completeDay(page, 'd-mon');
    check('the day circle moves it', await band(), '1/4 sessions');

    await completeDayBySet(page, 'd-thu');
    check('ticking sets moves it too', await band(), '2/4 sessions');

    await clearDay(page, 'd-mon');
    check('and it goes back down', await band(), '1/4 sessions');
  });

  // ------------------------------------------------------------------- effort
  await test('effort is rated per set and stored with it', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('columns are labelled',
      await page.locator('.wt-panel .wt-shead span').evaluateAll(
        (els) => els.map((e) => e.textContent).filter(Boolean)),
      ['done', 'kg', 'reps', 'effort']);
    check('three choices per set',
      await page.locator('.wt-panel .wt-set:nth-child(1) .wt-fxb').allTextContents(), ['Easy', 'Moderate', 'Hard']);
    check('nothing rated to start', await page.locator('.wt-panel .wt-fxb.on').count(), 0);

    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);
    await rate(page, 1, 0);
    await rate(page, 2, 0);
    await rate(page, 3, 1);
    await rate(page, 4, 2);
    check('each set keeps its own rating', await storedEfforts(page, 'mon-1'), [0, 0, 1, 2]);
    check('history reads them back', (await page.textContent('.wt-panel .wt-hist')).includes('EEMH'), true);

    await rate(page, 4, 2);   // the lit button clears
    check('a rating can be taken back', await storedEfforts(page, 'mon-1'), [0, 0, 1, null]);
    await rate(page, 4, 2);

    await page.click('.wt-panel .wt-close');
    await page.reload();
    await page.waitForTimeout(350);
    await page.click('[data-id="mon-1"] .wt');
    check('ratings come back with the panel',
      await page.locator('.wt-panel .wt-fxb.on').evaluateAll((els) => els.map((e) => e.dataset.e)),
      ['0', '0', '1', '2']);
  });

  await test('rating a set ticks it off', { date: '2026-07-23T09:00:00' }, async (page) => {
    const pips = () => page.locator('[data-id="mon-1"] .pip').evaluateAll(
      (els) => els.map((e) => (e.classList.contains('filled') ? 1 : 0)));

    await openRow(page, 'mon-1');
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);
    check('opening and loading it logs nothing', await pips(), [0, 0, 0, 0]);

    await rate(page, 2, 1);
    check('the rated set completes itself', await pips(), [0, 1, 0, 0]);
    check('the done control shows it', await page.locator('.wt-panel .wt-sdone[data-i="1"].on').count(), 1);
    check('the rest starts as if it were ticked', await page.locator('#rest-bar').isHidden(), false);
    check('and it is stored like any tick', await page.evaluate(
      () => JSON.parse(localStorage.getItem('sams-training-week')).sets['mon-1']), [0, 1, 0, 0]);

    await rate(page, 2, 1);   // the lit button clears the rating
    check('clearing the rating leaves the set done', await pips(), [0, 1, 0, 0]);
    check('with the rating gone', await storedEfforts(page, 'mon-1'), [null, null, null, null]);

    await tickSet(page, 'mon-1', 1);
    await rate(page, 1, 2);
    check('rating a set already ticked leaves it ticked', await pips(), [1, 1, 0, 0]);

    await rate(page, 3, 0);
    await rate(page, 4, 0);
    check('the row completes on the last rating', await page.locator('[data-id="mon-1"].done').count(), 1);
    check('and every rating is kept', await storedEfforts(page, 'mon-1'), [2, null, 0, 0]);
  });

  await test('effort decides whether the load goes up', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);
    check('planned reps do not recommend adding load', await page.locator('.wt-panel [data-hint]').isHidden(), true);

    for (const n of [1, 2, 3, 4]) await rate(page, n, 2);
    check('a grind at the top of the range holds it', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'All sets at 8, but every one was a grind — repeat 100 kg before adding.');
    check('and reads as a caution', await page.locator('.wt-panel [data-hint].caution').count(), 1);

    // back down the range: now effort is the only thing that can speak
    for (const i of [0, 1, 2, 3]) await page.fill(`.wt-panel .wt-sr[data-i="${i}"]`, '6');
    await page.waitForTimeout(200);
    check('hard low in the range says stay', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'Every set hard — stay at 100 kg next week and add reps.');

    for (const n of [1, 2, 3, 4]) await rate(page, n, 0);
    check('easy low in the range says go up', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'Every set easy — 102.5 kg is there next week.');
    check('and reads as a green light', await page.locator('.wt-panel [data-hint].caution').count(), 0);

    await rate(page, 4, 1);
    check('one unrated-away session says nothing new', (await page.textContent('.wt-panel [data-hint]')).trim(), '');
  });

  await test('last week\u2019s effort greets you at the lift', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-2': [{ ew: ew - 1, w: 40, s: [{w:40,r:8,e:0},{w:40,r:8,e:0},{w:40,r:8,e:0}] }] },
      }));
    `) }, async (page) => {
    check('the chip carries it', await page.locator('[data-id="mon-2"] .wt .wt-fxdot.fx0').count(), 1);
    await page.click('[data-id="mon-2"] .wt');
    check('and the hint opens with it', (await page.textContent('.wt-panel [data-hint]')).trim(),
      'Last week felt easy — start at 42.5 kg.');
    check('today starts unrated', await page.locator('.wt-panel .wt-fxb.on').count(), 0);
  });

  await test('a plateau at one load is called out', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const wk = (w) => ({ ew: w, w: 40, s: [{w:40,r:6,e:2},{w:40,r:6,e:2},{w:40,r:6,e:2}] });
      const flat = (w) => ({ ew: w, w: 30, s: [{w:30,r:6},{w:30,r:6},{w:30,r:6},{w:30,r:6}] });
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-2': [wk(ew - 3), wk(ew - 2), wk(ew - 1)],
              'mon-3': [flat(ew - 3), flat(ew - 2), flat(ew - 1)] },
      }));
    `) }, async (page) => {
    check('the chip warns', await page.locator('[data-id="mon-2"] .wt .wt-fxdot.fx2').count(), 1);
    await page.click('[data-id="mon-2"] .wt');
    check('the stall is named with a way out', (await page.textContent('.wt-panel [data-hint]')).trim(),
      '3 sessions at 40 kg and still hard — hold the load and chase reps, or drop to 35 kg and build back.');

    // the same stall with nothing rated can only ask for the missing input
    await page.click('[data-id="mon-3"] .wt');
    await page.waitForTimeout(150);
    check('no dot without ratings', await page.locator('[data-id="mon-3"] .wt .wt-fxdot.fx0, [data-id="mon-3"] .wt .wt-fxdot.fx1, [data-id="mon-3"] .wt .wt-fxdot.fx2').count(), 0);
    check('an unrated stall asks to be rated', (await page.textContent('.wt-panel [data-hint]')).trim(),
      '30 kg for 3 sessions running — rate the sets and the next step picks itself.');
  });

  await test('chart dots carry the week\u2019s effort', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const wk = (w, r, e) => ({ ew: w, w: 100, s: [{w:100,r,e,done:true},{w:100,r,e,done:true},{w:100,r,e,done:true},{w:100,r,e,done:true}] });
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [wk(ew - 2, 6, 2), wk(ew - 1, 7, 1), wk(ew, 8, 0)] },
      }));
    `) }, async (page) => {
    await page.click('#tab-progress');
    await page.waitForTimeout(300);
    check('the colours are explained once', await page.locator('.fx-legend').count(), 1);
    const card = page.locator('.chart-card', { hasText: 'Leg press' });
    check('same load, week by week getting easier',
      await card.locator('.cc-plot circle').evaluateAll((els) => els.map((e) => e.getAttribute('class'))),
      ['dot fx2', 'dot fx1', 'end fx0']);
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
    await page.fill('.wt-panel .wt-top', '85');
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

    await page.click('#cel-next');
    await page.waitForTimeout(150);
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('streak counts the week', (await page.textContent('.hist-streak')).trim(), 'streak · 1 wk');
    check('roll-up counts sessions', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('4/4 sessions'), true);
  });

  // Finishing the week is the only thing that ends it: the celebration hands
  // straight over to a fresh set of cards, with nothing left to reset.
  await test('a finished week flows into the next', { date: '2026-08-01T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '90');
    await page.waitForTimeout(120);
    await page.click('.wt-panel .wt-close');
    for (const id of ['d-mon', 'd-wed', 'd-thu', 'd-sat']) await completeDay(page, id);
    await page.waitForTimeout(300);
    check('celebration shown', await page.locator('#celebrate').isVisible(), true);

    await page.click('#cel-next');
    await page.waitForTimeout(250);
    check('next week starts clean', await page.locator('.pip.filled').count(), 0);
    check('band names the new week', (await page.textContent('#wb-when')).trim(), 'New week from today');
    check('no sessions yet', (await page.textContent('#wb-count')).trim(), '0/4 sessions');
    check('last week is the weight to beat', await page.locator('[data-id="mon-1"] .wt.is-prev').count(), 1);
    check('target value', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '90');

    // the finished week is in the log, dated the day it was actually done
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    check('finished week logged', (await page.textContent('.wk-lines')).replace(/\s+/g, ' ').includes('4/4 sessions'), true);
    check('trained today', await page.locator('.cal-cell.c-today.c-ball, .cal-cell.c-today.c-done').count(), 1);

    // and it stays put across a reload — no second celebration, no going back
    await page.reload();
    await page.waitForTimeout(350);
    check('still on the new week', await page.locator('.pip.filled').count(), 0);
    check('celebration does not repeat', await page.locator('#celebrate').isHidden(), true);
  });

  /* Rest days complete themselves when their date arrives, so counting them
     towards the week held a session-complete week open until the calendar
     caught up — the band reading 4/4 and History calling the week done while
     the cards refused to turn over. Monday: Friday's rest slot is days away. */
  await test('a week finishes on its sessions, not on the rest days',
    { date: '2026-07-20T09:00:00' }, async (page) => {
    for (const id of ['d-mon', 'd-wed', 'd-thu']) await completeDay(page, id);
    check('three in, not done', await page.locator('#celebrate').isHidden(), true);

    await completeDay(page, 'd-sat');
    await page.waitForTimeout(300);
    check('the band is full', (await page.textContent('#wb-count')).trim(), '4/4 sessions');
    check('and the week finishes with it', await page.locator('#celebrate').isVisible(), true);

    await page.click('#cel-next');
    await page.waitForTimeout(250);
    check('the next week starts today', (await page.textContent('#wb-when')).trim(), 'New week from today');
    check('with nothing carried over', await page.locator('.pip.filled').count(), 0);
  });

  await test('logging Sunday adds it as a bonus', { date: '2026-08-02T09:00:00' }, async (page) => {
    for (const id of ['d-mon', 'd-wed', 'd-thu', 'd-sat']) await completeDay(page, id);
    await page.waitForTimeout(250);
    await page.click('#cel-next');
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

  // Sessions land on whatever day they were done, so the colour has to come
  // from the session stamped on a date — not from the date being a Wednesday.
  await test('calendar colours a day by the session done on it', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const start = monday - 14;
      const daysDone = {};
      daysDone[start + 2] = 1;      // Monday's lift caught up on the Wednesday
      daysDone[start + 4] = 1;      // the game itself moved to the Friday
      daysDone[start + 9] = 1;      // a Wednesday inside tracked history, unstamped
      const weeks = {};
      weeks[ew - 2] = { start, done: { 'd-mon': start + 2, 'd-wed': start + 4 } };
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone,
        backfilled: 1, perSet: 1, weeks, weekNo: ew,
      }));
    `) }, async (page) => {
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => {
      const t = new Date();
      const dn = Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5);
      return 7 * Math.floor((dn + 3) / 7) - 3 - 14;
    });
    const cls = (n) => page.getAttribute(`.cal-cell[data-dn="${n}"]`, 'class');

    check('a lift done on a Wednesday is a lift', (await cls(d + 2)).includes('c-done'), true);
    check('and not a game', (await cls(d + 2)).includes('c-ball'), false);
    check('the game is on the day it was played', (await cls(d + 4)).includes('c-ball'), true);
    check('a tracked day with no session stamp is a lift',
      (await cls(d + 9)).includes('c-done'), true);
    check('only one game night', await page.locator('.cal-cell.c-ball').count(), 1);
  });

  // The game card and the rest cards are read off the program, so emptying
  // the game card in the editor stops it claiming a colour it no longer earns.
  await test('an emptied game card is rest, not a game', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const start = monday - 14;
      const daysDone = {};
      daysDone[start] = 1;          // the Monday lift
      daysDone[start + 9] = 1;      // a Wednesday, with no game in the program
      const weeks = {};
      weeks[ew - 2] = { start, done: { 'd-mon': start } };
      const one = (id, name) => [{ id, rest: 0, name, rx: '3 x 8', sets: 1 }];
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone,
        backfilled: 1, perSet: 1, weeks, weekNo: ew,
        program: {
          'd-mon': one('mon-1', 'Leg press'), 'd-wed': [],
          'd-thu': one('thu-1', 'Trap bar DL'), 'd-sat': one('sat-1', 'Hip thrust'),
          'd-sun': one('sun-1', 'Incline walk'),
        },
      }));
    `) }, async (page) => {
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => {
      const t = new Date();
      const dn = Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 864e5);
      return 7 * Math.floor((dn + 3) / 7) - 3 - 14;
    });
    const cls = (n) => page.getAttribute(`.cal-cell[data-dn="${n}"]`, 'class');

    check('no game night anywhere', await page.locator('.cal-cell.c-ball').count(), 0);
    check('a logged Wednesday is a lift', (await cls(d + 9)).includes('c-done'), true);
    check('the empty Wednesday reads as rest', (await cls(d + 2)).includes('c-rest'), true);
    check('Tuesday still rest', (await cls(d + 1)).includes('c-rest'), true);
    check('Friday still rest', (await cls(d + 4)).includes('c-rest'), true);
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

  // ------------------------------------------------------------ chart metrics
  await test('adding reps at the same load shows as progress', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const wk = (w, r) => ({ ew: w, w: 100, s: [{w:100,r,done:true},{w:100,r,done:true},{w:100,r,done:true},{w:100,r,done:true}] });
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [wk(ew - 2, 6), wk(ew - 1, 7), wk(ew, 8)] },
      }));
    `) }, async (page) => {
    await page.click('#tab-progress');
    await page.waitForTimeout(300);
    const card = page.locator('.chart-card', { hasText: 'Leg press' });

    // default metric is estimated 1RM, which moves with reps
    check('est 1RM is the default', await page.locator('.mt.on').textContent(), 'Est. 1RM');
    check('no effort legend when nothing is rated', await page.locator('.fx-legend').count(), 0);
    check('1RM rises on reps alone', (await card.locator('.cc-now').textContent()).trim(), '126.7 kg');
    check('delta is shown', (await card.locator('.cc-delta').textContent()).trim().startsWith('▲'), true);

    // volume tells the same story in tonnage
    await page.click('.mt[data-m="vol"]');
    await page.waitForTimeout(300);
    check('volume totals every set',
      (await page.locator('.chart-card', { hasText: 'Leg press' }).locator('.cc-now').textContent()).trim(),
      '3200 kg');

    // top set alone is flat — the blind spot this replaced
    await page.click('.mt[data-m="top"]');
    await page.waitForTimeout(300);
    const topCard = page.locator('.chart-card', { hasText: 'Leg press' });
    check('top set is flat', (await topCard.locator('.cc-now').textContent()).trim(), '100 kg');
    check('and shows no gain', await topCard.locator('.cc-delta').count(), 0);

    await page.reload();
    await page.waitForTimeout(350);
    await page.click('#tab-progress');
    await page.waitForTimeout(300);
    check('choice persists', await page.locator('.mt.on').textContent(), 'Top set');
  });

  // --------------------------------------------------- sets, notes, rest span
  await test('a session can add or drop sets', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    check('starts at the prescribed count', await page.locator('.wt-panel .wt-set').count(), 4);
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);

    await page.click('.wt-panel .wt-nset[data-d="1"]');
    await page.waitForTimeout(200);
    check('a fifth set appears', await page.locator('.wt-panel .wt-set').count(), 5);
    await page.fill('.wt-panel .wt-sw[data-i="4"]', '80');
    await page.fill('.wt-panel .wt-sr[data-i="4"]', '12');
    await page.waitForTimeout(200);
    check('the extra set is saved as a plan', await page.evaluate(() => JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1'].at(-1).s.map(x => x.r)), [8,8,8,8,12]);

    await page.click('.wt-panel .wt-nset[data-d="-1"]');
    await page.waitForTimeout(200);
    check('and can be dropped again', await page.locator('.wt-panel .wt-set').count(), 4);
    check('storage follows', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,8,12'), false);
  });

  await test('clearing every weight clears the session', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '100');
    await page.waitForTimeout(150);
    check('logged', await page.locator('[data-id="mon-1"] .wt.is-set').count(), 1);

    for (const i of [0, 1, 2, 3]) await page.fill(`.wt-panel .wt-sw[data-i="${i}"]`, '');
    await page.waitForTimeout(250);
    check('chip reverts', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '+');
    check('no ghost entry left', await page.evaluate(
      () => (JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1'] || []).length), 0);
  });

  await test('rest length follows the exercise', { date: '2026-07-23T09:00:00' }, async (page) => {
    // heavy compounds get long rests, isolation gets short ones
    await tickSet(page, 'mon-1', 1);                // leg press, 4 x 6-8
    check('heavy compound rests 3:00', await page.textContent('#rb-time'), '3:00');
    await page.click('#rb-stop');

    await tickSet(page, 'mon-4', 1);                // calf/tib raise, 3 x 15
    check('isolation rests 1:00', await page.textContent('#rb-time'), '1:00');
    await page.click('#rb-stop');

    await tickSet(page, 'mon-6', 1);                // zone-2 walk
    check('cardio starts no timer', await page.locator('#rest-bar').isHidden(), true);

    // and can be overridden per exercise, including switched off
    await openRow(page, 'mon-4');
    check('panel shows the prescribed span', (await page.textContent('.wt-panel [data-rest]')).trim(), 'rest 1:00');
    await page.click('.wt-panel [data-rest]');
    await page.waitForTimeout(120);
    check('cycles on tap', (await page.textContent('.wt-panel [data-rest]')).trim(), 'rest 1:30');
    await page.click('.wt-panel .wt-sdone[data-i="1"]');
    await page.waitForTimeout(200);
    check('override is used', await page.textContent('#rb-time'), '1:30');
  });

  await test('rest bar shows context, progress and overtime', { date: '2026-07-23T09:00:00' }, async (page) => {
    await tickSet(page, 'mon-1', 1);
    check('names the lift', (await page.textContent('#rb-lab')).trim(), 'Rest · Leg press or goblet squat');
    check('counts the set', (await page.textContent('#rb-set')).trim(), 'set 1 of 4');
    check('bar starts full', await page.locator('#rb-fill').evaluate((e) => parseFloat(e.style.width) > 99), true);

    await page.clock.fastForward(90000);
    await page.waitForTimeout(150);
    check('halfway down', await page.textContent('#rb-time'), '1:30');
    const pct = await page.locator('#rb-fill').evaluate((e) => parseFloat(e.style.width));
    check('bar tracks remaining', pct > 45 && pct < 55, true);

    // -30 and +30 both work
    await page.click('#rb-minus');
    await page.waitForTimeout(120);
    check('minus 30', await page.textContent('#rb-time'), '1:00');
    await page.click('#rb-plus');
    await page.waitForTimeout(120);
    check('plus 30', await page.textContent('#rb-time'), '1:30');

    // past zero it counts up rather than vanishing
    await page.clock.fastForward(105000);
    await page.waitForTimeout(150);
    check('overtime counts up', (await page.textContent('#rb-time')).startsWith('+'), true);
    check('switches to go', (await page.textContent('#rb-lab')).trim().startsWith('Go ·'), true);
    check('still on screen', await page.locator('#rest-bar').isVisible(), true);

    // and gives up eventually
    await page.clock.fastForward(130000);
    await page.waitForTimeout(200);
    check('clears itself after a while', await page.locator('#rest-bar').isHidden(), true);
  });

  await test('notes stick to the exercise', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-notes', 'seat pin 4');
    await page.waitForTimeout(200);
    check('shows on the row', (await page.textContent('[data-id="mon-1"] .row-note')).trim(), '✎ seat pin 4');

    // the note and the caret both live inside .ex, so neither may leak into
    // the exercise's name
    await page.click('.wt-panel .wt-sdone[data-i="0"]');
    await page.waitForTimeout(200);
    check('name is clean in the rest bar', (await page.textContent('#rb-lab')).trim(),
      'Rest · Leg press or goblet squat');
    await page.click('#rb-stop');
    await page.click('#tab-progress');
    await page.waitForTimeout(300);
    check('and in chart titles',
      await page.locator('.cc-name', { hasText: 'seat pin' }).count(), 0);
    await page.click('#tab-week');
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForTimeout(350);
    check('survives reload', (await page.textContent('[data-id="mon-1"] .row-note')).trim(), '✎ seat pin 4');
  });

  // ------------------------------------------------------------ program editor
  await test('the program can be edited', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('#pref-edit');
    await page.waitForTimeout(200);
    check('editor opens', await page.locator('#editor').isVisible(), true);

    const first = page.locator('.ed-ex').first();
    await first.locator('.ed-name').fill('Hack squat');
    await first.locator('.ed-sets').fill('5');
    await page.click('#ed-save');
    await page.waitForTimeout(600);

    check('rename applied', (await page.textContent('[data-id="mon-1"] .ex')).includes('Hack squat'), true);
    check('set count applied', await page.getAttribute('[data-id="mon-1"]', 'data-sets'), '5');
    check('pips follow', await page.locator('[data-id="mon-1"] .pip').count(), 5);

    // history follows the id, not the name
    await page.click('[data-id="mon-1"] .wt');
    check('panel matches new count', await page.locator('.wt-panel .wt-set').count(), 5);
    await page.click('.wt-panel .wt-close');

    // add and remove
    await page.click('#pref-edit');
    await page.waitForTimeout(200);
    const before = await page.locator('#d-mon .row').count();
    await page.click('.ed-day:first-child .ed-add');
    await page.waitForTimeout(150);
    await page.locator('.ed-day:first-child .ed-ex').last().locator('.ed-name').fill('Calf press');
    await page.click('#ed-save');
    await page.waitForTimeout(600);
    check('exercise added', await page.locator('#d-mon .row').count(), before + 1);

    // reset restores the shipped program
    await page.click('#pref-edit');
    await page.waitForTimeout(200);
    await page.click('#ed-reset');   // arm
    await page.click('#ed-reset');   // confirm
    await page.waitForTimeout(600);
    check('reset restores default', (await page.textContent('[data-id="mon-1"] .ex')).includes('Leg press'), true);
    check('and the default count', await page.locator('#d-mon .row').count(), 7);
  });

  /* The editor shows name, sets and reps — not the prescribed rest. Anything
     it cannot show it still has to carry, or renaming one lift quietly
     retimes every rest in the program to the generic default. */
  await test('editing the program keeps the rest each lift prescribes',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    await openRow(page, 'mon-1');
    check('heavy lift rests three minutes', (await page.textContent('.wt-panel .wt-rest')).trim(), 'rest 3:00');
    await page.click('.wt-panel .wt-close');

    await page.click('#pref-edit');
    await page.waitForTimeout(200);
    await page.locator('.ed-ex').first().locator('.ed-name').fill('Hack squat');
    await page.click('#ed-save');
    await page.waitForTimeout(700);

    await openRow(page, 'mon-1');
    check('and still does after an unrelated rename',
      (await page.textContent('.wt-panel .wt-rest')).trim(), 'rest 3:00');
    await page.click('.wt-panel .wt-close');

    // the zone-2 walk prescribes no rest at all — it must not grow one
    await openRow(page, 'mon-6');
    check('the walk is still untimed', await page.locator('.wt-panel .wt-rest').count(), 0);
  });

  // ------------------------------------------------------- history week detail
  await test('a week expands to show what was lifted', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const daysDone = {};
      [0, 2, 3, 5].forEach(o => daysDone[monday - 7 + o] = 1);
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone, backfilled: 1, perSet: 1,
        wt: { 'mon-1': [{ ew: ew - 1, w: 100, s: [{w:100,r:8,e:0},{w:100,r:8,e:0},{w:95,r:6,e:2}] }] },
      }));
    `) }, async (page) => {
    await page.click('#tab-history');
    await page.waitForTimeout(300);
    const line = page.locator('.wk-line.has-detail').first();
    check('week is expandable', await line.count(), 1);
    check('collapsed by default', await page.locator('.wk-detail').count(), 0);

    await line.click();
    await page.waitForTimeout(200);
    check('detail opens', await page.locator('.wk-detail').count(), 1);
    const detail = (await page.textContent('.wk-detail')).replace(/\s+/g, ' ');
    check('names the lift', detail.includes('Leg press'), true);
    check('shows loads and reps', detail.includes('100–95 kg × 8,8,6'), true);
    check('and how the sets felt', detail.includes('8,8,6 EEH'), true);

    await line.click();
    await page.waitForTimeout(200);
    check('closes again', await page.locator('.wk-detail').count(), 0);
  });

  // --------------------------------------------------- restore is defensive
  await test('a damaged backup is refused, and changes nothing', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [{ ew: ew - 1, w: 142.5, s: [{w:142.5,r:8}] }] },
      }));
    `) }, async (page) => {
    const stored = () => page.evaluate(() => localStorage.getItem('sams-training-weights'));
    const before = await stored();

    await page.click('#backup-btn');
    await page.fill('#bk-text', JSON.stringify({
      app: 'sams-training-week', v: 1, history: { wt: 'not-an-object' },
    }));
    await page.click('#bk-restore');
    await page.waitForTimeout(200);
    check('says what is wrong with it', (await page.textContent('.bk-note')).includes('wt'), true);
    check('and does not even arm', (await page.textContent('#bk-restore')).trim(), 'Restore');
    check('storage untouched', await stored(), before);

    // a lift whose set list is not a list is caught the same way
    await page.fill('#bk-text', JSON.stringify({
      app: 'sams-training-week', v: 1, history: { wt: { 'mon-1': [{ ew: 1, w: 5, s: 'nope' }] } },
    }));
    await page.click('#bk-restore');
    await page.waitForTimeout(200);
    check('a bad set list is caught too', (await page.textContent('.bk-note')).includes('mon-1'), true);
    check('still untouched', await stored(), before);

    // and a good backup still restores
    await page.fill('#bk-text', JSON.stringify({
      app: 'sams-training-week', v: 1,
      history: { unit: 'kg', wt: { 'mon-2': [{ ew: 1, w: 60, s: [{ w: 60, r: 8 }] }] } },
    }));
    await page.click('#bk-restore');
    await page.waitForTimeout(150);
    await page.click('#bk-restore');
    await page.waitForTimeout(400);
    check('a sound backup goes in', await page.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('sams-training-weights')).wt)), ['mon-2']);
  });

  await test('a backup that only breaks on use is rolled back', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [{ ew: ew - 1, w: 142.5, s: [{w:142.5,r:8}] }] },
      }));
    `) }, async (page) => {
    const before = await page.evaluate(() => localStorage.getItem('sams-training-weights'));

    // every key is the declared shape, so this passes the door check — but a
    // week record holding a number instead of a record throws once read
    await page.click('#backup-btn');
    await page.fill('#bk-text', JSON.stringify({
      app: 'sams-training-week', v: 1,
      history: { unit: 'kg', wt: {}, weeks: { 2951: 7 }, weekNo: 2951 },
    }));
    await page.click('#bk-restore');
    await page.waitForTimeout(150);
    await page.click('#bk-restore');
    await page.waitForTimeout(500);

    check('the user is told', (await page.textContent('.bk-note')).includes('nothing has been changed'), true);
    check('the write is undone', await page.evaluate(
      () => localStorage.getItem('sams-training-weights')), before);
    check('the screen is put back', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '142.5');
  });

  await test('an unreadable store starts empty instead of dying', { date: '2026-07-23T09:00:00',
    seed: new Function(`
      localStorage.setItem('sams-training-weights', JSON.stringify({ wt: 'irrecoverable' }));
    `) }, async (page) => {
    check('the app still renders', await page.locator('.row').count() > 0, true);
    check('and says what happened', await page.locator('#broken-warn').isVisible(), true);
    check('the unreadable copy is kept', await page.evaluate(
      () => (localStorage.getItem('sams-training-weights-unreadable') || '').includes('irrecoverable')), true);
    check('Restore is still reachable', await page.locator('#backup-btn').isEnabled(), true);
  });

  await test('a write that fails is not passed off as saved', { date: '2026-07-23T09:00:00' },
    async (page) => {
    check('no warning to begin with', await page.locator('#store-warn').isVisible(), false);
    await page.evaluate(() => {
      localStorage.setItem = function(){ throw new Error('quota'); };
    });
    await tickSet(page, 'mon-1', 1);
    check('the failure is surfaced', await page.locator('#store-warn').isVisible(), true);
  });

  // ------------------------------------------------------------- backup nudge
  await test('a stale backup is called out', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [{ ew: ew, w: 100, s: [{w:100,r:8}] }] },
      }));
    `) }, async (page) => {
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable:true, value:{writeText:async()=>{}} }));
    check('never-backed-up warning', (await page.textContent('#bk-age')).includes('Never backed up'), true);
    await page.click('#backup-btn');
    await page.click('#bk-copy');
    await page.waitForTimeout(200);
    await page.click('#bk-close');
    check('clears once backed up', await page.locator('#bk-age').isHidden(), true);
  });

  // --------------------------------------------------------------- rest timer
  await test('rest timer runs, extends and can be turned off', { date: '2026-07-23T09:00:00' }, async (page) => {
    check('hidden at rest', await page.locator('#rest-bar').isHidden(), true);

    await tickSet(page, 'thu-1', 1);           // log a working set
    check('bar appears', await page.locator('#rest-bar').isVisible(), true);
    check('starts at the prescribed span', await page.textContent('#rb-time'), '3:00');

    await page.clock.fastForward(60000);
    await page.waitForTimeout(100);
    check('counts down', await page.textContent('#rb-time'), '2:00');

    await page.click('#rb-plus');
    await page.waitForTimeout(100);
    check('+30s extends', await page.textContent('#rb-time'), '2:30');

    await page.clock.fastForward(155000);
    await page.waitForTimeout(150);
    check('reaches zero', (await page.textContent('#rb-time')).startsWith('+'), true);
    check('signals go', (await page.textContent('#rb-lab')).trim().startsWith('Go ·'), true);

    // the fixed bar must not sit on top of the footer controls
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(200);
    const prefBox = await page.locator('#pref-rest').boundingBox();
    const barBox = await page.locator('#rest-bar').boundingBox();
    check('footer clears the bar', prefBox.y + prefBox.height <= barBox.y, true);

    await page.click('#rb-stop');
    check('dismissable', await page.locator('#rest-bar').isHidden(), true);

    // a zone-2 finisher is not a working set
    await tickSet(page, 'thu-6', 1);
    check('no timer after a walk', await page.locator('#rest-bar').isHidden(), true);

    // and it can be switched off entirely
    await page.click('#pref-rest');
    await tickSet(page, 'thu-2', 1);
    check('off means off', await page.locator('#rest-bar').isHidden(), true);
    await page.reload();
    await page.waitForTimeout(350);
    check('preference persists', await page.getAttribute('#pref-rest', 'aria-pressed'), 'false');
  });

  // -------------------------------------------------------------- roll-overs
  await test('sessions are logged on the day they were done', { date: '2026-07-23T09:00:00' }, async (page) => {
    // Thursday: Monday's lift is being caught up on, so Thursday is the date
    // that belongs in the log — not the slot the card sits in.
    await completeDay(page, 'd-mon');
    const marked = await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      return Object.keys(w.daysDone).map(Number).sort();
    });
    const today = await page.evaluate(() => {
      const d = new Date();
      return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    });
    check('stamped with today', marked, [today]);

    await clearDay(page, 'd-mon');
    check('clearing takes the stamp back', await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      return Object.keys(w.daysDone).length;
    }), 0);
  });

  await test('a week finished last session moves on when you come back',
    { date: '2026-08-01T09:00:00' }, async (page) => {
    for (const id of ['d-mon', 'd-wed', 'd-thu', 'd-sat']) await completeDay(page, id);
    await page.waitForTimeout(300);
    check('celebrating', await page.locator('#celebrate').isVisible(), true);

    // closed without dismissing it, opened again the next day
    await page.clock.setFixedTime(new Date('2026-08-02T09:00:00'));
    await page.reload();
    await page.waitForTimeout(400);
    check('celebration is done with', await page.locator('#celebrate').isHidden(), true);
    check('on the next week', await page.locator('.pip.filled').count(), 0);
    check('band names it', (await page.textContent('#wb-when')).trim(), 'New week from today');
  });

  // Upgrading mid-week must not cost anyone the sets they have already ticked.
  await test('a week in progress survives the upgrade', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const daysDone = { [monday]: 1, [monday + 2]: 1 };   // Mon and Wed done
      const sets = {};
      ['mon-1','mon-2','mon-3','mon-4','mon-5','sat-5','mon-6','wed-1'].forEach(k => sets[k] = 99);
      localStorage.setItem('sams-training-week', JSON.stringify({
        week: '2026-W30', sets, celebrated: false,          // the old ISO week id
      }));
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone, backfilled: 1, perSet: 1,
      }));
    `) }, async (page) => {
    check('Monday still complete', await page.locator('#d-mon.closed').count(), 1);
    check('its sets are intact', await page.locator('#d-mon .pip.filled').count(), 20);
    check('band counts them', (await page.textContent('#wb-count')).trim(), '2/4 sessions');
    check('the old stamps are kept', await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      return Object.keys(w.daysDone).length;
    }), 2);
    check('the week is pinned to its Monday', await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      const d = new Date();
      const dn = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
      return w.weeks[w.weekNo].start === 7 * Math.floor((dn + 3) / 7) - 3;
    }), true);
  });

  await test('an unfinished week gives way after seven days', { date: '2026-07-23T09:00:00' }, async (page) => {
    await completeDay(page, 'd-mon');
    await page.click('#d-mon .day-name');
    await page.waitForTimeout(300);
    await page.click('[data-id="mon-1"] .wt');
    await page.fill('.wt-panel .wt-top', '75');
    await page.waitForTimeout(120);
    await page.click('.wt-panel .wt-close');

    // age the running week by a week the way real time would: it turns over
    // on its own and the logged weight becomes last week's
    await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      w.weeks[w.weekNo].start -= 7;
      localStorage.setItem('sams-training-weights', JSON.stringify(w));
    });
    await page.reload();
    await page.waitForTimeout(350);
    check('sets reset', await page.locator('.pip.filled').count(), 0);
    check('weight carried over as the target', await page.locator('[data-id="mon-1"] .wt.is-prev').count(), 1);
    check('target value', (await page.textContent('[data-id="mon-1"] .wt .wt-val')).trim(), '75');
    check('the session it did log is kept', await page.evaluate(() => {
      const w = JSON.parse(localStorage.getItem('sams-training-weights'));
      return Object.keys(w.daysDone).length;
    }), 1);
  });

  // -------------------------------------------------------------------- layout
  /* The week list is what you read mid-set, so it is a list of what to do.
     Why a lift is in the program is read once and lives behind the caret the
     row already had; the note you wrote yourself stays on the row. */
  await test('the coaching line rides in the exercise, the note rides on the row',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    const why = page.locator('[data-id="mon-1"] .why');
    check('present but not shown', await why.count(), 1);
    check('hidden while the row is shut', await why.isVisible(), false);

    await openRow(page, 'mon-1');
    check('and shown once it is open', await why.isVisible(), true);
    check('reading the reason it is programmed',
      (await why.textContent()).trim(), 'leg strength = longevity anchor');

    await page.fill('.wt-panel .wt-notes', 'seat pin 4');
    await page.waitForTimeout(150);
    await page.click('.wt-panel .wt-close');
    check('the note stays on the closed row',
      await page.locator('[data-id="mon-1"] .row-note').isVisible(), true);

    // finishing the lift strikes the name — and only the name
    await tickAll(page, 'mon-1');
    await page.click('#d-mon .day-head');       // the day collapsed itself
    await page.waitForTimeout(400);
    const deco = (sel) => page.locator(sel).evaluate((e) => getComputedStyle(e).textDecorationLine);
    check('the name is struck through', await deco('[data-id="mon-1"] .ex-name'), 'line-through');
    check('the note is not', await deco('[data-id="mon-1"] .row-note'), 'none');
  });

  /* The masthead is read once. Landing on it every time a tab is tapped put
     the first chart most of a screen below the fold. */
  await test('tabs land on the content, not on the masthead',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    const mastBottom = await page.locator('.masthead').evaluate(
      (e) => e.getBoundingClientRect().bottom + scrollY);
    /* as far as the title, or as far as the page goes — a view shorter than
       the screen cannot scroll, and has nothing below the fold to rescue */
    const scrolledPastTitle = () => page.evaluate((m) => {
      const max = document.documentElement.scrollHeight - innerHeight;
      return scrollY >= Math.min(m, max) - 2;
    }, mastBottom);

    await page.click('#tab-progress');
    await settleScroll(page);
    check('scrolled past the title', await scrolledPastTitle(), true);
    check('the measure toggle is on screen', await page.locator('.metric-tabs').evaluate(
      (e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), true);

    await page.click('#tab-history');
    await settleScroll(page);
    check('history too', await scrolledPastTitle(), true);
    check('the calendar is on screen', await page.locator('.cal').evaluate(
      (e) => e.getBoundingClientRect().top < innerHeight / 2), true);
  });

  /* Opening the last lift on a card used to build its panel below the fold,
     so the tap looked like it had done nothing at all. */
  await test('opening a lift brings its sets onto the screen',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.evaluate(() => document.querySelector('#d-thu').scrollIntoView());
    await page.waitForTimeout(300);
    const last = '[data-id="thu-4"]';
    check('it starts low on the screen', await page.locator(last).evaluate(
      (e) => e.getBoundingClientRect().top > innerHeight * 0.5), true);

    await page.click(`${last} .ex`);
    await page.waitForTimeout(900);
    check('the next set controls are visible', await page.locator('.wt-panel .next-set').evaluate(
      (e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; }), true);
  });

  await test('the standing orders start out of the way', { date: '2026-07-23T09:00:00' },
    async (page) => {
    check('closed on load', await page.locator('.rules').evaluate((e) => e.open), false);
    check('the list is not taking up room', await page.locator('.rules li').first().isVisible(), false);
    await page.click('.rules summary');
    await page.waitForTimeout(200);
    check('and opens when asked', await page.locator('.rules li').first().isVisible(), true);
  });

  // -------------------------------------------------------------- keyboard/AT
  /* Collapsing a day was a mouse-only gesture on a plain <header>, and the
     rows it clipped stayed in the tab order, so a keyboard could land on
     controls nothing on screen was showing. */
  await test('a day collapses from the keyboard, and takes its rows with it',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    const head = page.locator('#d-mon .day-head');
    check('the header announces itself open', await head.getAttribute('aria-expanded'), 'true');
    check('and points at what it opens', await head.getAttribute('aria-controls'), 'd-mon-body');

    await head.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    check('Enter collapses it', await page.locator('#d-mon.closed').count(), 1);
    check('and it says so', await head.getAttribute('aria-expanded'), 'false');
    check('the rows it hid are unfocusable',
      await page.locator('#d-mon .row').first().isVisible(), false);

    await page.keyboard.press(' ');
    await page.waitForTimeout(400);
    check('Space opens it again', await page.locator('#d-mon.closed').count(), 0);
    check('and says so', await head.getAttribute('aria-expanded'), 'true');
    check('rows are back', await page.locator('#d-mon .row').first().isVisible(), true);

    // completing the day collapses it too — the header has to keep up
    await completeDay(page, 'd-mon');
    await page.waitForTimeout(400);
    check('a completed day reads as collapsed', await head.getAttribute('aria-expanded'), 'false');
  });

  /* Every overlay was a one-way door for a keyboard: the only way out was a
     tap on a button inside it. */
  await test('Escape backs out of whatever is covering the page',
    { date: '2026-07-23T09:00:00' }, async (page) => {
    for (const [open, el] of [['#pref-edit', '#editor'], ['#backup-btn', '#backup']]) {
      await page.click(open);
      await page.waitForTimeout(200);
      check(el + ' opens', await page.locator(el).isVisible(), true);
      check(el + ' is a dialog', await page.getAttribute(el, 'role'), 'dialog');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      check(el + ' closes on Escape', await page.locator(el).isHidden(), true);
    }

    await openRow(page, 'mon-1');
    check('the exercise panel is open', await page.locator('.wt-panel').count(), 1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    check('Escape closes it too', await page.locator('.wt-panel').count(), 0);
  });

  // P1/P2 regressions: use disposable browser contexts, never the live app.
  await test('P1 plans stay out of progress; completed sets survive rollover', { date: '2026-07-23T09:00:00' }, async (page) => {
    await openRow(page, 'mon-1');
    await page.fill('.wt-top', '50');
    await page.click('.wt-close');
    await page.click('#tab-progress');
    check('one useful empty state', await page.locator('.pg-empty').count(), 1);
    check('only the body section remains, no empty lift groups', await page.locator('.pg-day').count(), 1);
    await page.click('#tab-week');
    await tickSet(page, 'mon-1', 1);
    await page.fill('.wt-sw[data-i="1"]', '200');
    await page.click('.wt-close');
    await page.click('#tab-progress');
    await page.click('.mt[data-m="vol"]');
    const volume = () => page.locator('.chart-card', {hasText:'Leg press'}).locator('.cc-now').textContent();
    check('only one actual set counted', (await volume()).trim(), '400 kg');
    await page.reload();
    await page.click('#tab-progress');
    check('completion persists on reload', (await volume()).trim(), '400 kg');
    await page.click('#tab-week');
    await tickSet(page, 'mon-1', 1);
    await page.click('#tab-progress');
    check('unticking removes it from progress', await page.locator('.pg-empty').count(), 1);
    await page.click('#tab-week');
    await tickSet(page, 'mon-1', 1);
    await page.clock.fastForward(8 * 86400000);
    await page.reload();
    await page.click('#tab-progress');
    check('past partial session counts only completed work', (await volume()).trim(), '400 kg');
  });

  await test('P1 lift history retains more than thirty entries', { date:'2026-07-23T09:00:00', seed:new Function(seedHelpers + `
    localStorage.setItem('sams-training-weights', JSON.stringify({ perSet:1,
      wt:{'mon-1':Array.from({length:35}, (_,i)=>({ew:ew-35+i,w:50,s:[{w:50,r:8}]}))}
    }));
  `)}, async(page)=>{
    await openRow(page,'mon-1');
    await page.fill('.wt-top','55');
    await tickSet(page,'mon-1',1);
    const entries=await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1']);
    check('all old entries plus current plan retained',entries.length,36);
    check('oldest unchanged',entries[0].s,[{w:50,r:8}]);
    await page.reload();
    check('retention survives reload',await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1'].length),36);
  });

  await test('P1 removing a completed set supports undo after reload', {date:'2026-07-23T09:00:00'}, async(page)=>{
    await openRow(page,'mon-1');
    await page.fill('.wt-top','50');
    await page.fill('.wt-sr[data-i="3"]','6');
    await rate(page,4,2);
    await page.click('.wt-nset[data-d="-1"]');
    check('three sets remain',await page.locator('.wt-set').count(),3);
    check('pips follow session count',await page.locator('[data-id="mon-1"] .pip').count(),3);
    await page.fill('.wt-sw[data-i="0"]','60');
    await page.reload();
    await openRow(page,'mon-1');
    check('removal persisted below prescribed count',await page.locator('.wt-set').count(),3);
    check('undo survives',await page.locator('[data-undo]').isVisible(),true);
    await page.click('[data-undo]');
    check('four sets restored',await page.locator('.wt-set').count(),4);
    check('later edit preserved',await page.inputValue('.wt-sw[data-i="0"]'),'60');
    check('removed reps restored',await page.inputValue('.wt-sr[data-i="3"]'),'6');
    check('removed effort restored',await page.locator('.wt-set:nth-child(4) .wt-fxb.on').textContent(),'Hard');
    check('removed completion restored',await page.getAttribute('.wt-sdone[data-i="3"]','aria-pressed'),'true');
    await page.click('.wt-nset[data-d="1"]');
    check('extra set counted in progress pips',await page.locator('[data-id="mon-1"] .pip').count(),5);
    check('new set is unfinished',await page.getAttribute('.wt-sdone[data-i="4"]','aria-pressed'),'false');
  });

  await test('P1 numbered completion saves prefilled weights', {date:'2026-07-23T09:00:00',seed:new Function(seedHelpers+`
    localStorage.setItem('sams-training-weights',JSON.stringify({perSet:1,wt:{'mon-2':[{ew:ew-1,w:40,s:[{w:40,r:8},{w:40,r:8},{w:40,r:8}]}]}}));
  `)},async(page)=>{
    await tickSet(page,'mon-2',1);
    await page.reload();
    const ss=await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-2'].at(-1).s);
    check('tick stores actual weight',ss[0].w,40);
    check('only ticked set complete',ss.map(x=>x.done),[true,false,false]);
  });

  await test('P2 backup copy failure does not reset reminder', {date:'2026-07-23T09:00:00'},async(page)=>{
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(Error('denied'))}}));
    await page.click('#backup-btn');
    await page.click('#bk-copy');
    await page.waitForTimeout(100);
    check('failed copy date remains unset',await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).lastBackup || null),null);
    check('failure provides recovery',(await page.textContent('.bk-note')).includes('Copy failed'),true);
    await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}}));
    await page.click('#bk-copy');
    await page.waitForTimeout(100);
    check('successful copy is dated',await page.evaluate(()=>typeof JSON.parse(localStorage.getItem('sams-training-weights')).lastBackup),'number');
  });

  await test('P2 downloadable backup round trips through file import', {date:'2026-07-23T09:00:00'},async(page)=>{
    await openRow(page,'mon-1');
    await page.fill('.wt-top','65');
    await tickSet(page,'mon-1',1);
    await page.click('#backup-btn');
    const downloading=page.waitForEvent('download');
    await page.click('#bk-download');
    const download=await downloading;
    const data=fs.readFileSync(await download.path());
    check('download contains own data',JSON.parse(data).history.wt['mon-1'][0].s[0].w,65);
    check('initiating a download is not confirmation',await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).lastBackup || null),null);
    await page.click('#bk-confirm');
    check('confirmed file has date',await page.evaluate(()=>typeof JSON.parse(localStorage.getItem('sams-training-weights')).lastBackup),'number');
    await page.setInputFiles('#bk-file',{name:'backup.json',mimeType:'application/json',buffer:data});
    await page.waitForTimeout(100);
    check('import is staged, not applied',await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).lastBackupMethod),'file');
    await page.click('#bk-restore');
    check('first click asks to replace',await page.textContent('#bk-restore'),'Replace all data?');
    await page.click('#bk-restore');
    check('restored completion intact',await page.evaluate(()=>JSON.parse(localStorage.getItem('sams-training-weights')).wt['mon-1'][0].s[0].done),true);
    check('restore closes stale panel',await page.locator('.wt-panel').count(),0);
    await page.click('#backup-btn');
    await page.setInputFiles('#bk-file',{name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{no')});
    await page.waitForTimeout(100);
    check('bad file explained', (await page.textContent('.bk-note')).includes('Nothing has been changed'),true);
  });

  await test('P2 modals contain focus and return it', {date:'2026-07-23T09:00:00'},async(page)=>{
    for(const [opener,modal] of [['#backup-btn','#backup'],['#pref-edit','#editor']]){
      await page.click(opener);
      check('focus starts inside '+modal,await page.locator(modal).evaluate(e=>e.contains(document.activeElement)),true);
      await page.keyboard.press('Shift+Tab');
      check('backwards tab wraps inside '+modal,await page.locator(modal).evaluate(e=>e.contains(document.activeElement)),true);
      await page.keyboard.press('Tab');
      check('forward tab wraps inside '+modal,await page.locator(modal).evaluate(e=>e.contains(document.activeElement)),true);
      check('background is inert',await page.locator('#view-week').evaluate(e=>e.inert),true);
      await page.keyboard.press('Escape');
      check('focus returns to opener',await page.locator(opener).evaluate(e=>e===document.activeElement),true);
      check('background is active again',await page.locator('#view-week').evaluate(e=>e.inert),false);
    }
  });

  await test('P2 rest timer resumes after reload and stays dismissed', {date:'2026-07-23T09:00:00'},async(page)=>{
    await tickSet(page,'mon-1',1);
    await page.clock.fastForward(60000);
    await page.reload();
    check('timer comes back',await page.locator('#rest-bar').isVisible(),true);
    check('correct time remaining',await page.textContent('#rb-time'),'2:00');
    check('set context comes back',await page.textContent('#rb-set'),'set 1 of 4');
    await page.click('#rb-stop');
    await page.reload();
    check('skip persists',await page.locator('#rest-bar').isHidden(),true);
    await tickSet(page,'mon-1',2);
    await page.clock.fastForward(310000);
    await page.reload();
    check('old timer stays expired',await page.locator('#rest-bar').isHidden(),true);
  });

  await test('P2 phone targets fit without horizontal scrolling', {date:'2026-07-23T09:00:00'},async(page)=>{
    for(const width of [320,390,768]){
      await page.setViewportSize({width,height:844});
      await openRow(page,'mon-1');
      check('no horizontal overflow at '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      check('comfortable done and effort targets at '+width,await page.locator('.wt-sdone,.wt-fxb').evaluateAll(els=>els.every(e=>{const r=e.getBoundingClientRect();return r.width>=44 && r.height>=44;})),true);
    }
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
