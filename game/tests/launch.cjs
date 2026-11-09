const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidence = process.env.STAGE_EVIDENCE_DIR;
const button = { left: 235, right: 405, top: 865, bottom: 910 };
const portrait = { left: 280, right: 360, top: 360, bottom: 450 };
const cream = (r, g, b) => r > 235 && g > 210 && b > 190;
const skin = (r, g, b) => r > 140 && r - g > 18 && g - b > 10;

function countPixels(png, bounds, condition) {
  let count = 0;
  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const offset = (y * png.width + x) * 4;
      if (condition(png.data[offset], png.data[offset + 1], png.data[offset + 2])) count++;
    }
  }
  return count;
}

async function snapshot(canvas, predicate) {
  const deadline = Date.now() + 12000;
  do {
    const bytes = await canvas.screenshot();
    if (predicate(PNG.sync.read(bytes))) return bytes;
  } while (Date.now() < deadline);
  return null;
}

async function checkStage(browser, url, input) {
  const page = await browser.newPage({
    viewport: { width: 640, height: 960 },
    hasTouch: input === 'touch',
  });
  try {
    const errors = [];
    const outbound = new Set();
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /ERROR:(SCRIPT|GUI|RESOURCE)/.test(message.text())) {
        errors.push(message.text());
      }
    });
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    page.on('request', request => {
      if (new URL(request.url()).origin !== new URL(url).origin) outbound.add(request.url());
    });

    // Hold the engine download long enough to subscribe at Bridge's public event boundary.
    let allowEngine;
    const observerAttached = new Promise(resolve => { allowEngine = resolve; });
    await page.route('**/*.wasm', async route => {
      await observerAttached;
      await route.continue();
    });

    const response = await page.goto(url);
    assert.ok(response?.ok(), 'The local HTML5 game loads');
    await page.waitForFunction(() => window.bridge?.isInitialized);
    await page.evaluate(() => {
      const sdk = window.bridge;
      window.gameReady = new Promise(resolve => {
        sdk.platform.on(sdk.EVENT_NAME.PLATFORM_MESSAGE_SENT, message => {
          if (message === sdk.PLATFORM_MESSAGE.GAME_READY) resolve();
        });
      });
    });
    allowEngine();

    const canvas = page.locator('canvas');
    const stage = await canvas.boundingBox();
    assert.ok(stage && Math.abs(stage.height / stage.width - 1.5) < 0.01, 'The game stage is portrait-oriented');
    const before = await snapshot(canvas, image => countPixels(image, button, cream) > 4500);
    assert.ok(before, 'The Start makeover prompt appears on the game stage');
    assert.ok(countPixels(PNG.sync.read(before), portrait, skin) > 2500, 'The character is visible before Start');
    await page.evaluate(() => Promise.race([
      window.gameReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge did not receive GAME_READY')), 3000)),
    ]));

    const x = stage.x + stage.width / 2;
    const y = stage.y + stage.height * 0.925;
    if (input === 'touch') {
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await wait(80);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await page.mouse.click(x, y, { delay: 80 });
    }

    const after = await snapshot(canvas, image => countPixels(image, button, cream) < 2000);
    assert.ok(after, 'Starting the makeover dismisses the Start prompt');
    assert.ok(countPixels(PNG.sync.read(after), portrait, skin) > 2500, 'The character remains visible after Start');
    assert.deepEqual(errors, [], 'The package loads without browser or HTTP errors');
    assert.deepEqual([...outbound], [], 'Standalone preview makes no cross-origin requests');

    if (evidence) {
      fs.mkdirSync(evidence, { recursive: true });
      fs.writeFileSync(path.join(evidence, `${input}-before.png`), before);
      fs.writeFileSync(path.join(evidence, `${input}-after.png`), after);
    }
    console.log(`PASS: ${input}, portrait, Start makeover, Bridge GAME_READY and same-origin resources.`);
  } finally {
    await page.close();
  }
}

async function main() {
  const bundle = process.argv[2] ?? path.join(__dirname, '../../.scratch/html5/Runway Rewind');
  const server = preview(bundle);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/`;
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      await checkStage(browser, url, 'mouse');
      await checkStage(browser, url, 'touch');
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
