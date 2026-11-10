const { enterLevel, tapStage } = require('./entry.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { createStagePointer, holdPimples, pimples } = require('./stage-pointer.cjs');

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
    if (!readyPage) await enterLevel(page);
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

async function checkProgress({ down, move, up, snapshot }) {
  const start = await snapshot();
  assert.ok(filled(start.pixel(212, 32)), 'Level entry starts the treatment HUD');
  await down(320, 888);
  await up();
  await wait(700);
  const first = await snapshot();
  assert.ok(filled(first.pixel(212, 32)), 'The compact strip marks the current treatment');
  assert.ok(!filled(first.pixel(230, 32)), 'The next treatment is still pending');
  await down(320, 828);
  await holdPimples(move);
  await up();
  await wait(1300);
  const next = await snapshot('second-treatment-progress');
  assert.ok(filled(next.pixel(230, 32)), 'Completing extraction advances the overall progress strip');
}

function visibleArc(before, after, x, y, radius) {
  let samples = 0;
  for (let i = 0; i < 120; i++) {
    const angle = i * Math.PI / 60;
    const px = x + radius * Math.cos(angle);
    const py = y + radius * Math.sin(angle);
    const [r, g, b] = after.pixel(px, py);
    const [oldR, oldG, oldB] = before.pixel(px, py);
    if (r >= oldR && g - oldG > 19 && b - oldB > 13) samples++;
  }
  return samples / 120;
}

async function checkGuidance({ down, move, up, snapshot }) {
  const start = await snapshot();
  await down(320, 888);
  await up();
  await wait(700);
  const ready = await snapshot('portrait-extraction-guides');
  await wait(2000);
  const idle = await snapshot();
  assert.equal(changedNear(ready, idle, 257, 232, 20), 0, 'The target stays marked while the player waits');
  await down(320, 828);
  await holdPimples(move, pimples.slice(0, 1));
  await up();
  await wait(350);
  const treated = await snapshot('portrait-one-target-treated');
  assert.ok(changedNear(ready, treated,257,232,16)>10, 'The treated target visibly changes');
  assert.equal(changedNear(ready, treated, 346, 259, 18), 0, 'The other target stays marked');
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
  assert.ok(outside[0]>150 && outside[2]>180, 'Wide displays extend the pastel backdrop');
  await down(320, 888);
  await up();
  await wait(670);
  const ready = await snapshot(name + '-tool-ready');
  assert.ok(filled(ready.pixel(212, 32)), 'The current treatment stays visible above the face');
  await down(320, 828);
  await holdPimples(move, pimples.slice(0, 1));
  const held = await snapshot(name + '-held');
  assert.ok(changedNear(ready, held, 257, 232, 12) > 10, 'The working tip treats the targeted blemish');
  assert.equal(changedNear(ready, held, 346, 259, 8), 0, 'The other blemish stays intact');
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
