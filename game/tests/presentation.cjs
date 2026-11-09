const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { createStagePointer } = require('./stage-pointer.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidence = process.env.STAGE_EVIDENCE_DIR;

async function play(browser, url, viewport, input, check, readyPage) {
  const page = readyPage ?? await browser.newPage({ viewport, hasTouch: input === 'touch' });
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
    });
    if (!readyPage) await page.goto(url);
    await page.locator('#game-loading').waitFor({ state: 'hidden' });
    const stage = await page.locator('canvas').boundingBox();
    const scale = Math.min(stage.width / 640, stage.height / 960);
    const offsetX = stage.x + (stage.width - 640 * scale) / 2;
    const offsetY = stage.y + (stage.height - 960 * scale) / 2;
    const point = (x, y) => ({ x: offsetX + x * scale, y: offsetY + y * scale });
    const { move, down, up } = await createStagePointer(page, input, point, { moveDelay: 26, downDelay: 35 });
    async function snapshot(name) {
      const bytes = await page.screenshot();
      if (name && evidence) {
        fs.mkdirSync(evidence, { recursive: true });
        fs.writeFileSync(path.join(evidence, name + '.png'), bytes);
      }
      const image = PNG.sync.read(bytes);
      function screenPixel(x, y) {
        const i = (Math.round(y) * image.width + Math.round(x)) * 4;
        return image.data.subarray(i, i + 3);
      }
      return {
        screenPixel,
        pixel(x, y) {
          const at = point(x, y);
          return screenPixel(at.x, at.y);
        },
      };
    }
    await check({ down, move, up, snapshot, stage, viewport });
    assert.deepEqual(errors, []);
  } finally {
    if (!readyPage) await page.close();
  }
}

const filled = ([r, g, b]) => r > 240 && g > 180 && g < 223 && b < 163;
const blemishes = [
  [257, 232], [346, 259], [389, 270], [249, 286], [219, 444], [351, 416], [431, 418],
  [420, 432], [383, 453], [418, 493], [246, 531], [406, 528], [291, 574], [343, 572],
];

async function checkProgress({ down, move, up, snapshot }) {
  const start = await snapshot();
  assert.ok(!filled(start.pixel(212, 56)), 'Start screen leaves the treatment HUD clear');
  await down(320, 888);
  await up();
  await wait(700);
  const first = await snapshot();
  assert.ok(filled(first.pixel(212, 56)), 'The compact strip marks the current treatment');
  assert.ok(!filled(first.pixel(230, 56)), 'The next treatment is still pending');
  await down(320, 828);
  for (const [x, y] of blemishes) {
    await move(x - 28, y + 24);
    await wait(34);
  }
  await up();
  await wait(1300);
  const next = await snapshot('second-treatment-progress');
  assert.ok(filled(next.pixel(230, 56)), 'Completing extraction advances the overall progress strip');
}

function guideNear(image, x, y, radius) {
  let count = 0;
  for (let dy = -radius; dy <= radius; dy += 3) {
    for (let dx = -radius; dx <= radius; dx += 3) {
      const [r, g, b] = image.pixel(x + dx, y + dy);
      if (r > 240 && g > 210 && b > 164) count++;
    }
  }
  return count;
}

async function untilVisible(snapshot, visible, message) {
  const deadline = Date.now() + 4400;
  do {
    if (visible(await snapshot())) return;
    await wait(65);
  } while (Date.now() < deadline);
  assert.fail(message);
}

async function checkGuidance({ down, move, up, snapshot }) {
  await down(320, 888);
  await up();
  await untilVisible(snapshot, image => guideNear(image, 296, 650, 32) > 5,
    'The first-use demonstration moves upward from the extractor toward the portrait');
  await snapshot('portrait-first-drag');
  await down(320, 828);
  await move(229, 256);
  await up();
  await wait(450);
  const justTreated = await snapshot();
  assert.ok(guideNear(justTreated, 346, 259, 24) < 5, 'Successful work gives the player space');
  await untilVisible(snapshot, image => guideNear(image, 346, 259, 24) > 5,
    'After a stall the hint appears by a remaining pimple');
  const hint = await snapshot('portrait-next-target');
  assert.ok(guideNear(hint, 257, 232, 24) < 5, 'The hint leaves the finished pimple alone');
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function changedNear(before, after, x, y, radius) {
  let count = 0;
  for (let dy = -radius; dy <= radius; dy += 2) {
    for (let dx = -radius; dx <= radius; dx += 2) {
      if (colorDistance(before.pixel(x + dx, y + dy), after.pixel(x + dx, y + dy)) > 16) count++;
    }
  }
  return count;
}

async function checkViewport({ down, move, up, snapshot, stage, viewport }) {
  const name = viewport.width === viewport.height ? 'square' : 'landscape';
  assert.ok(Math.abs(stage.width / stage.height - 2 / 3) < 0.005, 'The portrait retains its shape');
  assert.ok(stage.x >= 0 && stage.y >= 0 &&
    stage.x + stage.width <= viewport.width && stage.y + stage.height <= viewport.height,
  'The whole stage stays in view');
  const start = await snapshot();
  const outside = start.screenPixel(stage.x - 5, stage.height * 0.14);
  assert.ok(colorDistance(outside, start.pixel(3, 134)) < 17,
    'The wider backdrop continues the sage at the portrait edge');
  await down(320, 888);
  await up();
  await wait(670);
  const ready = await snapshot(name + '-tool-ready');
  assert.ok(filled(ready.pixel(212, 56)), 'The current treatment stays visible above the face');
  assert.ok(changedNear(start, ready, 320, 828, 42) > 35, 'The tool arrives within reach');
  await down(320, 828);
  await move(229, 256);
  await wait(330);
  const held = await snapshot(name + '-held');
  assert.ok(changedNear(ready, held, 257, 232, 12) > 10, 'The working tip treats the targeted blemish');
  assert.equal(changedNear(ready, held, 346, 259, 12), 0, 'The other blemish stays intact');
  await up();
  await wait(350);
  const returned = await snapshot(name + '-tool-returned');
  assert.equal(changedNear(ready, returned, 320, 867, 12), 0, 'Releasing returns the tool to its original rest');
}

async function main() {
  assert.ok(process.argv[2], 'Pass the directory of the debug HTML5 bundle');
  const server = preview(process.argv[2]);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      await play(browser, url, { width: 640, height: 960 }, 'mouse', checkProgress);
      await play(browser, url, { width: 390, height: 844 }, 'touch', checkGuidance);
      await play(browser, url, { width: 960, height: 540 }, 'mouse', checkViewport);
      await play(browser, url, { width: 640, height: 640 }, 'touch', checkViewport);
      console.log('Presentation checks passed.');
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

module.exports = { play, checkProgress, checkGuidance, checkViewport };

if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
