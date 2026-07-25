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
    await page.fill('.wt-panel .wt-top', '102.5');
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

  // ------------------------------------------------------------ chart metrics
  await test('adding reps at the same load shows as progress', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const wk = (w, r) => ({ ew: w, w: 100, s: [{w:100,r},{w:100,r},{w:100,r},{w:100,r}] });
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
    check('the extra set is stored', (await page.textContent('.wt-panel .wt-hist')).includes('8,8,8,8,12'), true);

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
    await page.click('[data-id="mon-1"] .ex');      // leg press, 4 x 6-8
    await page.waitForTimeout(200);
    check('heavy compound rests 3:00', await page.textContent('#rb-time'), '3:00');
    await page.click('#rb-stop');

    await page.click('[data-id="mon-4"] .ex');      // calf/tib raise, 3 x 15
    await page.waitForTimeout(200);
    check('isolation rests 1:00', await page.textContent('#rb-time'), '1:00');
    await page.click('#rb-stop');

    await page.click('[data-id="mon-6"] .ex');      // zone-2 walk
    await page.waitForTimeout(200);
    check('cardio starts no timer', await page.locator('#rest-bar').isHidden(), true);

    // and can be overridden per exercise, including switched off
    await page.click('[data-id="mon-4"] .wt');
    check('panel shows the prescribed span', (await page.textContent('.wt-panel [data-rest]')).trim(), 'rest 1:00');
    await page.click('.wt-panel [data-rest]');
    await page.waitForTimeout(120);
    check('cycles on tap', (await page.textContent('.wt-panel [data-rest]')).trim(), 'rest 1:30');
    await page.click('.wt-panel .wt-close');
    await page.click('[data-id="mon-4"] .ex');
    await page.waitForTimeout(200);
    check('override is used', await page.textContent('#rb-time'), '1:30');
  });

  await test('rest bar shows context, progress and overtime', { date: '2026-07-23T09:00:00' }, async (page) => {
    await page.click('[data-id="mon-1"] .ex');
    await page.waitForTimeout(200);
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
    await page.click('.wt-panel .wt-close');
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
    check('and the default count', await page.locator('#d-mon .row').count(), 6);
  });

  // ------------------------------------------------------- history week detail
  await test('a week expands to show what was lifted', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      const daysDone = {};
      [0, 2, 3, 5].forEach(o => daysDone[monday - 7 + o] = 1);
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone, backfilled: 1, perSet: 1,
        wt: { 'mon-1': [{ ew: ew - 1, w: 100, s: [{w:100,r:8},{w:100,r:8},{w:95,r:6}] }] },
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

    await line.click();
    await page.waitForTimeout(200);
    check('closes again', await page.locator('.wk-detail').count(), 0);
  });

  // ------------------------------------------------------------- backup nudge
  await test('a stale backup is called out', { date: '2026-07-23T09:00:00',
    seed: new Function(seedHelpers + `
      localStorage.setItem('sams-training-weights', JSON.stringify({
        unit: 'kg', variants: {}, bw: [], game: [], weeksDone: [], daysDone: {}, perSet: 1,
        wt: { 'mon-1': [{ ew: ew, w: 100, s: [{w:100,r:8}] }] },
      }));
    `) }, async (page) => {
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

    await page.click('[data-id="thu-1"] .ex'); // log a working set
    await page.waitForTimeout(150);
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
    await page.fill('.wt-panel .wt-top', '90');
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
    await page.fill('.wt-panel .wt-top', '75');
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
