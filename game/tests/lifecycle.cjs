const assert = require('node:assert/strict');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const face = { x: 175, y: 400, width: 290, height: 130 };
const startPrompt = { x: 235, y: 865, width: 170, height: 45 };
const leftCheek = { x: 185, y: 425, width: 102, height: 85 };
const rightCheek = { x: 353, y: 425, width: 102, height: 85 };

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
  });
  return errors;
}

async function frame(page, clip) {
  const screenshot = clip ? await page.screenshot({ clip }) : await page.locator('canvas').screenshot();
  return PNG.sync.read(screenshot).data;
}

async function openStage(page, url) {
  await page.goto(url);
  await page.locator('#game-loading').waitFor({ state: 'detached' });
}

async function checkTransition(browser, url, development) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 } });
  try {
    const errors = trackErrors(page);
    await page.addInitScript(() => {
      window.rendered = 0;
      for (const gl of [WebGLRenderingContext, WebGL2RenderingContext]) {
        const clear = gl.prototype.clear;
        gl.prototype.clear = function (...args) {
          window.rendered++;
          return clear.apply(this, args);
        };
      }
    });
    await openStage(page, url);
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    assert.equal(await pause.count(), development ? 1 : 0);
    assert.equal(await page.getByRole('button', { name: 'Restart makeover', exact: true }).count(), development ? 1 : 0);
    await page.mouse.click(320, 888, { delay: 45 });
    await wait(120);
    // The standalone SDK receives window lifecycle events at the browser boundary.
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const paused = await frame(page);
    const renders = await page.evaluate(() => window.rendered);
    assert.ok(renders > 0, 'Chrome observes the game rendering before pause');
    await wait(550);
    assert.equal(await page.evaluate(() => window.rendered), renders, 'The paused game stops drawing');
    assert.ok((await frame(page)).equals(paused), 'A paused tool arrival stays visually frozen');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await wait(550);
    const arrived = await frame(page);
    assert.ok(await page.evaluate(() => window.rendered) > renders, 'The platform focus event resumes drawing');
    assert.ok(!arrived.equals(paused), 'The platform focus event lets the tool finish arriving');

    if (development) {
      await pause.click();
      const developerPaused = await page.evaluate(() => window.rendered);
      await wait(200);
      assert.equal(await page.evaluate(() => window.rendered), developerPaused, 'Developer Pause stops drawing');
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await wait(200);
      assert.equal(await page.evaluate(() => window.rendered), developerPaused,
        'Developer Resume cannot clear a host pause');
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await wait(200);
      assert.ok(await page.evaluate(() => window.rendered) > developerPaused, 'Focus resumes after developer Resume');
    }
    assert.deepEqual(errors, [], 'The game resumes without browser errors');
  } finally {
    await page.close();
  }
}

async function checkHeldStroke(browser, url, touch, development) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 }, hasTouch: touch });
  try {
    const errors = trackErrors(page);
    // Control host events at the SDK contract, independently of window focus.
    await page.route('**/playgama-bridge.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: `
        const listeners = new Map();
        const storage = new Map();
        window.bridge = {
          initialize: async () => { window.bridge.isInitialized = true; },
          EVENT_NAME: { PAUSE_STATE_CHANGED: 'pause', AUDIO_STATE_CHANGED: 'audio' },
          PLATFORM_MESSAGE: { GAME_READY: 'game_ready' },
          platform: {
            isPaused: false,
            isAudioEnabled: false,
            on: (event, callback) => listeners.set(event, callback),
            sendMessage: async () => {},
          },
          storage: {
            get: async key => storage.get(key) ?? null,
            set: async (key, value) => storage.set(key, value),
          },
        };
        window.hostPause = value => {
          window.bridge.platform.isPaused = value;
          listeners.get('pause')(value);
        };
      `,
    }));
    await openStage(page, url);
    const initial = await frame(page, face);
    const initialPrompt = await frame(page, startPrompt);
    const session = touch && await page.context().newCDPSession(page);
    async function move(x, y) {
      if (touch) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      } else {
        await page.mouse.move(x, y);
      }
      await wait(36);
    }
    async function down(x, y) {
      if (touch) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      await wait(36);
    }
    async function up() {
      if (touch) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.up();
      }
    }
    await down(320, 888);
    await up();
    await wait(550);
    // Settle the preceding extraction treatment through the visible pimple locations.
    await down(320, 828);
    for (const [x, y] of [[257, 232], [346, 259], [389, 270], [249, 286], [219, 444],
      [351, 416], [431, 418], [420, 432], [383, 453], [418, 493], [246, 531],
      [406, 528], [291, 574], [343, 572]]) {
      await move(x - 28, y + 24);
    }
    await up();
    await wait(1150);
    const leftBefore = await frame(page, leftCheek);
    const rightBefore = await frame(page, rightCheek);
    await down(320, 828);
    await move(127, 690);
    await move(127, 478);
    await move(216, 478);
    await move(62, 478);
    const partial = await frame(page, leftCheek);
    assert.ok(!partial.equals(leftBefore), 'A held stroke applies visible cream to the left cheek');

    await page.evaluate(() => window.hostPause(true));
    const frozen = await frame(page);
    await move(379, 478);
    if (touch) await up();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await wait(400);
    assert.ok((await frame(page)).equals(frozen), 'A browser focus event cannot resume a host-paused makeover');
    await page.evaluate(() => window.hostPause(false));
    await wait(120);
    if (!touch) {
      await move(380, 500);
      await up();
    }
    await wait(350);
    assert.ok((await frame(page, leftCheek)).equals(partial), 'Resuming preserves the exact cream stroke');
    assert.ok((await frame(page, rightCheek)).equals(rightBefore), 'Stale input applies no cream to the opposite cheek');

    await down(320, 828);
    await move(502, 690);
    await move(502, 478);
    await move(368, 478);
    await up();
    await wait(350);
    assert.ok(!(await frame(page, rightCheek)).equals(rightBefore), 'A fresh pickup works after resume');

    if (development) {
      const treated = await frame(page, face);
      const restart = page.getByRole('button', { name: 'Restart makeover' });
      page.once('dialog', dialog => dialog.dismiss());
      await restart.click();
      assert.ok((await frame(page, face)).equals(treated), 'Declining restart keeps treatment progress');
      page.once('dialog', dialog => dialog.accept());
      await restart.click();
      await wait(150);
      assert.ok((await frame(page, face)).equals(initial), 'Confirming restart restores the dirty portrait');
      assert.ok((await frame(page, startPrompt)).equals(initialPrompt), 'Confirming restart restores the Start prompt');
      await down(320, 888);
      await up();
      await wait(550);
      assert.ok(!(await frame(page, startPrompt)).equals(initialPrompt), 'The Start prompt can begin another run after restart');
    }
    assert.deepEqual(errors, [], 'The makeover continues without browser errors');
  } finally {
    await page.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const bundle = args.find(arg => arg !== '--release') ?? path.join(__dirname, '../../.scratch/html5/Runway Rewind');
  const development = !args.includes('--release');
  const server = preview(bundle);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      await checkTransition(browser, url, development);
      await checkHeldStroke(browser, url, false, development);
      await checkHeldStroke(browser, url, true, development);
      console.log('PASS: Tool arrival freezes, partial cream survives, stale input is cancelled, and a new pickup works.');
      console.log(development ? 'PASS: Developer pause and confirmed restart.' : 'PASS: Release omits development controls.');
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
