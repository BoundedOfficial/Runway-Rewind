const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidence = process.env.STAGE_EVIDENCE_DIR;
const eyes = [195, 295, 445, 470];
const lips = [246, 470, 394, 555];
const robe = [350, 804, 484, 925];
const leftHair = [96, 175, 194, 486];
const rightHair = [446, 175, 544, 486];

function count(image, [left, top, right, bottom], match) {
  let total = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const i = (y * image.width + x) * 4;
      if (match(image.data[i], image.data[i + 1], image.data[i + 2], i)) total++;
    }
  }
  return total;
}

function changed(before, after, bounds, tolerance = 15) {
  return count(before, bounds, (r, g, b, i) =>
    Math.abs(r - after.data[i]) + Math.abs(g - after.data[i + 1]) +
    Math.abs(b - after.data[i + 2]) > tolerance);
}

async function checkFinish(browser, url, input) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 }, hasTouch: input === 'touch' });
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
    });
    await page.goto(url);
    const canvas = page.locator('canvas');
    const stage = await canvas.boundingBox();
    const session = input === 'touch' && await page.context().newCDPSession(page);
    const point = (x, y) => ({ x: stage.x + x, y: stage.y + y });
    const touch = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
    async function move(x, y) {
      if (session) await touch('touchMove', [point(x, y)]);
      else await page.mouse.move(stage.x + x, stage.y + y);
      await wait(24);
    }
    async function down(x, y) {
      if (session) await touch('touchStart', [point(x, y)]);
      else {
        await move(x, y);
        await page.mouse.down();
      }
      await wait(34);
    }
    const up = () => session ? touch('touchEnd', []) : page.mouse.up();
    async function tap(x, y) {
      await down(x, y);
      await up();
    }
    async function stroke(points) {
      await down(320, 828);
      for (const [x, y] of points) await move(x - 28, y + 24);
      await up();
      await wait(290);
    }
    async function snapshot(name) {
      const bytes = await canvas.screenshot();
      if (name && evidence) {
        fs.mkdirSync(evidence, { recursive: true });
        fs.writeFileSync(path.join(evidence, `${input}-${name}.png`), bytes);
      }
      return PNG.sync.read(bytes);
    }
    const pale = (r, g, b) => r > 245 && g > 218 && b > 193;
    const prompt = [240, 874, 400, 902];
    const deadline = Date.now() + 10000;
    let dirty;
    do {
      dirty = await snapshot();
    } while (count(dirty, prompt, pale) < 2000 && Date.now() < deadline);
    assert.ok(count(dirty, prompt, pale) > 2000, 'Start makeover appears');
    await wait(120);
    dirty = await snapshot('dirty-start');
    await tap(320, 888);
    await wait(630);

    const before = await snapshot('hair-ready');
    assert.ok(count(before, [260, 491, 380, 539], (r, g, b) => r - g > 55 && r - b > 28) > 900,
      'The final-treatment fixture starts with the completed crimson lipstick');
    await stroke([[85, 750], [72, 610], [85, 547], [161, 548]]);
    const offTarget = await snapshot();
    assert.equal(changed(before, offTarget, [0, 510, 210, 710]), 0,
      'Brushing visible loose hair below the compact target does not start styling');

    await stroke([[85, 750], [85, 355], [122, 355], [155, 338]]);
    const partial = await snapshot('partial-left-hair');
    assert.ok(changed(before, partial, leftHair) > 300, 'Brushing a compact target begins styling that side');
    assert.equal(changed(before, partial, rightHair), 0, 'The opposite side stays unchanged');
    assert.equal(changed(before, partial, eyes), 0, 'Partial styling preserves the made-up eyes');
    assert.equal(changed(before, partial, lips), 0, 'Partial styling preserves the made-up lips');
    assert.equal(changed(before, partial, robe), 0, 'Partial styling preserves the clean silk');

    await stroke([[90, 730], [91, 440], [171, 440], [171, 385], [111, 385],
      [111, 330], [180, 330], [180, 275], [110, 275], [118, 220], [174, 220],
      [163, 170], [126, 170]]);
    await wait(620);
    const leftSettled = await snapshot('left-hair-settled');
    assert.ok(changed(before, leftSettled, leftHair) > 5000, 'Finishing the left target settles its artwork');
    assert.equal(changed(before, leftSettled, rightHair), 0, 'The right target still needs its own treatment');

    const actions = [194, 874, 288, 901];
    const treatmentLabel = [225, 28, 415, 49];
    const rest = [298, 790, 342, 841];
    await stroke([[553, 730], [549, 440], [469, 440], [469, 385], [529, 385],
      [529, 330], [460, 330], [460, 275], [530, 275], [522, 220], [466, 220],
      [477, 170], [514, 170]]);
    const revealDeadline = Date.now() + 3000;
    let reveal;
    do {
      reveal = await snapshot('finished-portrait-hold');
    } while (count(reveal, treatmentLabel, pale) >= 30 && Date.now() < revealDeadline);
    assert.ok(changed(before, reveal, rest) >= 500, 'The styling brush leaves when both targets settle');
    assert.ok(count(reveal, treatmentLabel, pale) < 30, 'The treatment label clears before the finished portrait hold');
    assert.ok(count(reveal, actions, pale) < 100, 'The finished portrait is held before actions appear');
    assert.ok(changed(before, reveal, rightHair) > 5000, 'Finishing the right target settles its artwork');
    assert.equal(changed(before, reveal, eyes), 0, 'The finished hairstyle preserves the eyes and their makeup');
    assert.equal(changed(before, reveal, lips), 0, 'The finished hairstyle preserves the lips and their expression');
    assert.equal(changed(before, reveal, robe), 0, 'The finished hairstyle preserves already-visible clean silk');

    await wait(1000);
    const finished = await snapshot('finished-portrait-actions');
    assert.ok(count(finished, actions, pale) > 1500, 'Replay appears after the finished portrait hold');
    assert.ok(count(finished, [352, 874, 446, 901], pale) > 1500, 'Next appears beside Replay');

    if (input === 'mouse') {
      await tap(399, 888);
      const end = await snapshot('end-of-content');
      assert.ok(changed(finished, end, eyes) > 25000, 'Next opens the end-of-content screen');
      assert.ok(count(end, [142, 427, 498, 454], pale) > 250, 'The end-of-content screen presents its message');
      assert.ok(count(end, [260, 503, 380, 534], pale) > 2500, 'The end-of-content screen offers Replay');
      await tap(320, 518);
    } else {
      await tap(241, 888);
    }

    const replay = await snapshot('replay-dirty');
    assert.ok(count(replay, prompt, pale) > 2000, 'Replay restores the Start makeover prompt');
    assert.equal(changed(dirty, replay, [0, 40, 640, 960]), 0,
      'Replay restores the original hair, robe, and blemishes');
    await tap(320, 888);
    await wait(600);
    const restarted = await snapshot();
    await stroke([[257, 232]]);
    const extracted = await snapshot('replay-extraction');
    assert.ok(changed(restarted, extracted, [246, 219, 268, 247]) > 50,
      'Replay starts from the extractor and can treat the first pimple again');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function main() {
  assert.ok(process.argv[2], 'Pass the directory of the debug finish fixture bundle');
  const server = preview(process.argv[2]);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      await checkFinish(browser, url, 'mouse');
      await checkFinish(browser, url, 'touch');
      console.log('Hair styling and final reveal passed. Verified Next to Replay with mouse and direct Replay with simulated touch.');
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
