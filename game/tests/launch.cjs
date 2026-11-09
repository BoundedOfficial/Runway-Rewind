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
const toolRest = { left: 296, right: 344, top: 770, bottom: 850 };
const leftCheek = { left: 187, right: 287, top: 422, bottom: 510 };
const rightCheek = { left: 353, right: 453, top: 422, bottom: 510 };
const forehead = { left: 228, right: 412, top: 206, bottom: 300 };
const neck = { left: 268, right: 372, top: 619, bottom: 694 };
const face = { left: 147, right: 493, top: 166, bottom: 813 };
const lowerTool = { left: 278, right: 362, top: 833, bottom: 858 };

function changedPixels(before, after, bounds, tolerance = 15) {
  let count = 0;
  for (let y = bounds.top; y < bounds.bottom; y++) {
    for (let x = bounds.left; x < bounds.right; x++) {
      const offset = (y * before.width + x) * 4;
      const change = [0, 1, 2].reduce((sum, channel) =>
        sum + Math.abs(before.data[offset + channel] - after.data[offset + channel]), 0);
      if (change > tolerance) count++;
    }
  }
  return count;
}

function saveEvidence(input, name, bytes) {
  if (!evidence) return;
  fs.mkdirSync(evidence, { recursive: true });
  fs.writeFileSync(path.join(evidence, `${input}-${name}.png`), bytes);
}

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
      if (message.type() === 'error' || /ERROR:/.test(message.text())) {
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
    saveEvidence(input, 'before', before);
    assert.ok(countPixels(PNG.sync.read(before), portrait, skin) > 2500,
      `The character is visible before Start (${errors.join(', ')})`);
    await page.evaluate(() => Promise.race([
      window.gameReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge did not receive GAME_READY')), 3000)),
    ]));

    const session = input === 'touch' && await page.context().newCDPSession(page);
    let point;
    async function move(x, y) {
      point = { x: stage.x + x * stage.width / 640, y: stage.y + y * stage.height / 960 };
      if (session) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
      } else {
        await page.mouse.move(point.x, point.y);
      }
    }
    async function down(x, y) {
      if (session) {
        point = { x: stage.x + x * stage.width / 640, y: stage.y + y * stage.height / 960 };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
      } else {
        await move(x, y);
        await page.mouse.down();
      }
      await wait(34);
    }
    async function up() {
      if (session) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.up();
      }
    }
    await down(320, 888);
    await up();

    const after = await snapshot(canvas, image => countPixels(image, button, cream) < 2000);
    assert.ok(after, 'Starting the makeover dismisses the Start prompt');
    assert.ok(countPixels(PNG.sync.read(after), portrait, skin) > 2500, 'The character remains visible after Start');
    const startup = PNG.sync.read(before);
    const ready = await snapshot(canvas, image => changedPixels(startup, image, toolRest) > 700);
    assert.ok(ready, 'The cream spatula arrives and rests at the bottom of the stage');
    await wait(450);
    const startFrame = await canvas.screenshot();
    const beforeDrag = PNG.sync.read(startFrame);
    saveEvidence(input, 'cream-ready', startFrame);
    await down(220, 450);
    await up();
    const unheld = PNG.sync.read(await canvas.screenshot());
    assert.equal(changedPixels(beforeDrag, unheld, leftCheek), 0, 'A portrait tap leaves cream unapplied');

    await down(320, 828);
    await move(127, 690);
    await move(127, 478);
    await move(216, 478);
    await wait(100);
    saveEvidence(input, 'cream-held', await canvas.screenshot());
    await up();
    await wait(350);
    const partial = await snapshot(canvas, image => changedPixels(beforeDrag, image, leftCheek) > 1600);
    assert.ok(partial, 'Dragging the cream spatula leaves visible cream after release');
    const applied = PNG.sync.read(partial);
    assert.equal(changedPixels(beforeDrag, applied, rightCheek), 0, 'Cream is local to the treated cheek');
    for (let x = 185; x <= 245; x += 5) {
      assert.equal(changedPixels(beforeDrag, applied, { left: x, right: x + 1, top: 454, bottom: 455 }, 30),
        1, 'A fast drag leaves a continuous trail between pointer samples');
    }
    await wait(350);
    const returnedFrame = await canvas.screenshot();
    const returned = PNG.sync.read(returnedFrame);
    assert.equal(changedPixels(beforeDrag, returned, toolRest), 0, 'The released spatula returns to rest');
    assert.equal(changedPixels(applied, returned, leftCheek), 0, 'Returning the tool preserves the stroke');
    saveEvidence(input, 'cream-partial', returnedFrame);

    // These strokes follow visible areas in portrait coordinates. The physical input is
    // offset from the tool's working tip by the fixed gameplay offset.
    async function sweep(points) {
      for (const [x, y] of points) {
        await move(x - 28, y + 24);
        await wait(24);
      }
    }
    function zigzag(left, right, first, last, step) {
      const points = [];
      for (let y = first; y <= last; y += step) {
        points.push([left, y], [right, y]);
        [left, right] = [right, left];
      }
      return points;
    }

    await down(320, 828);
    await sweep([[157, 690], [157, 375], ...zigzag(176, 299, 397, 587, 38)]);
    await up();
    await wait(420);
    const cheekFrame = await canvas.screenshot();
    const cheekSettled = PNG.sync.read(cheekFrame);
    assert.ok(changedPixels(returned, cheekSettled, leftCheek) > 1800, 'The left cheek settles after sufficient coverage');
    assert.equal(changedPixels(beforeDrag, cheekSettled, rightCheek), 0, 'The opposite cheek still needs treatment');
    assert.equal(changedPixels(beforeDrag, cheekSettled, forehead), 0, 'The forehead still needs treatment');
    assert.equal(changedPixels(beforeDrag, cheekSettled, toolRest), 0, 'The treatment still uses the cream spatula');
    saveEvidence(input, 'cream-one-cheek-settled', cheekFrame);

    await down(320, 828);
    await sweep([[510, 693], [510, 390], ...zigzag(444, 328, 400, 586, 38),
      [500, 390], [500, 250], ...zigzag(453, 187, 205, 347, 42)]);
    const fullCream = await snapshot(canvas, image =>
      changedPixels(beforeDrag, image, rightCheek) > 5000 &&
      changedPixels(beforeDrag, image, forehead) > 10000 &&
      changedPixels(beforeDrag, image, lowerTool) > 1400);
    if (!fullCream) saveEvidence(input, 'cream-handoff-diagnosis', await canvas.screenshot());
    assert.ok(fullCream, 'Completing the remaining cream regions brings in the cotton wipe automatically');
    await wait(480);
    const creamFrame = await canvas.screenshot();
    const creamSettled = PNG.sync.read(creamFrame);
    saveEvidence(input, 'cream-committed', creamFrame);
    await move(320, 828);
    await sweep([[147, 692], [147, 459], [265, 459], [378, 455]]);
    const heldThroughHandoff = PNG.sync.read(await canvas.screenshot());
    assert.equal(changedPixels(creamSettled, heldThroughHandoff, face), 0,
      'A drag held through the handoff cannot use the cotton wipe');
    await up();

    await down(320, 828);
    await sweep([[135, 700], [135, 466], [264, 466]]);
    await up();
    await wait(350);
    const wipedFrame = await canvas.screenshot();
    const wiped = PNG.sync.read(wipedFrame);
    assert.ok(changedPixels(creamSettled, wiped, leftCheek) > 2600, 'A picked-up wipe clears a visible part of the cream');
    assert.equal(changedPixels(creamSettled, wiped, rightCheek), 0, 'Wiping the left cheek leaves cream on the right cheek');
    assert.equal(changedPixels(creamSettled, wiped, neck), 0, 'A cheek stroke leaves the neck untouched');
    saveEvidence(input, 'wipe-partial', wipedFrame);

    await down(320, 828);
    await sweep([[133, 790], [133, 166], ...zigzag(144, 496, 182, 794, 44)]);
    await up();
    await wait(1200);
    const cleanFrame = await canvas.screenshot();
    const cleaned = PNG.sync.read(cleanFrame);
    saveEvidence(input, 'wipe-committed', cleanFrame);
    assert.ok(changedPixels(creamSettled, cleaned, rightCheek) > 5000, 'The right cheek is wiped clean');
    assert.ok(changedPixels(creamSettled, cleaned, neck) > 4000, 'The wiping treatment visibly cleans the neck');
    // Reference RGBs from the original dirty plate, with extracted and clean artwork
    // composited at these feathered points just outside the lips.
    for (const [x, y, expected] of [[260, 530, [169, 121, 90]], [381, 526, [175, 128, 96]],
      [266, 486, [163, 118, 89]]]) {
      const offset = (y * cleaned.width + x) * 4;
      const actual = [...cleaned.data.subarray(offset, offset + 3)];
      assert.ok(actual.every((channel, i) => Math.abs(channel - expected[i]) <= 8),
        `Wiping removes the cream rim at (${x}, ${y}), expected ${expected}, captured ${actual}`);
    }
    assert.equal(changedPixels(startup, cleaned, lowerTool), 0, 'The cotton wipe exits after the final area settles');
    await wait(250);
    assert.equal(changedPixels(cleaned, PNG.sync.read(await canvas.screenshot()), face, 0), 0,
      'The committed portrait stays stable while idle');
    assert.deepEqual(errors, [], 'The package loads without browser or HTTP errors');
    assert.deepEqual([...outbound], [], 'Standalone preview makes no cross-origin requests');

    saveEvidence(input, 'after', after);
    console.log(`PASS: ${input}, Start makeover, local resources, cream and wipe with independent regions and automatic handoff.`);
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
