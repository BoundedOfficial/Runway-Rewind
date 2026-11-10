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
const eyes = [195, 295, 445, 470];
const lips = [246, 470, 394, 555];
const robe = [350, 804, 484, 925];
const leftHair = [96, 175, 194, 486];
const rightHair = [446, 175, 544, 486];
const lowerLeftHair = [0, 510, 210, 710];
const lowerRightHair = [473, 510, 640, 710];

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

async function checkFinish(browser, url, input, release) {
  const page = release?.page ?? await browser.newPage({ viewport: { width: 640, height: 960 }, hasTouch: input === 'touch' });
  const milestone = release?.milestone ?? (async () => {});
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
    });
    if (!release) await page.goto(url);
    const canvas = page.locator('canvas');
    const stage = await canvas.boundingBox();
    const point = (x, y) => ({ x: stage.x + x, y: stage.y + y });
    const { move, down, up } = await createStagePointer(page, input, point, { moveDelay: 24, downDelay: 34 });
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
    let dirty = release?.dirty;
    if (!release) { await enterLevel(page); dirty = await snapshot('hair-start'); }

    const before = await snapshot('hair-ready');
    assert.ok(count(before, [260, 491, 380, 539], (r, g, b) => r - g > 55 && r - b > 28) > 900,
      'The styling treatment begins with crimson lipstick already applied');
    await stroke([[320, 755], [320, 620], [320, 250], [320, 660]]);
    assert.equal(changed(before, await snapshot(), [0, 70, 640, 960], 0), 0,
      'Brushing down the center of the face and robe does not style either side');

    await stroke([[320, 620], [100, 610], [85, 547]]);
    const leftPartial = await snapshot('lower-hair-stroke');
    const changedLowerHair = changed(before, leftPartial, lowerLeftHair);
    assert.ok(changedLowerHair > 300,
      `Brushing visible loose hair below the guide changes that hair (${changedLowerHair} pixels)`);
    assert.ok(changed(before, leftPartial, leftHair) > 300,
      'The side starts to settle together without leaving isolated loose locks');
    assert.equal(changed(before, leftPartial, rightHair), 0, 'The opposite side stays unchanged');
    assert.equal(changed(before, leftPartial, eyes), 0, 'Partial styling preserves the made-up eyes');
    assert.equal(changed(before, leftPartial, lips), 0, 'Partial styling preserves the made-up lips');
    assert.equal(changed(before, leftPartial, robe), 0, 'Partial styling preserves the clean silk');

    await stroke([[320, 620], [72, 610], [85, 520]]);
    await wait(620);
    const leftSettled = await snapshot('left-hair-settled');
    assert.ok(changed(leftPartial, leftSettled, lowerLeftHair) > 3000,
      'Brushing the same still-messy hair again settles the side');
    assert.equal(changed(before, leftSettled, rightHair), 0, 'The right side still needs its own treatment');

    await stroke([[320, 640], [320, 265], [367, 159], [395, 126], [440, 111]]);
    const crown = await snapshot('right-crown-stroke');
    assert.ok(changed(leftSettled, crown, [365, 80, 560, 220]) > 300, 'Brushing the crown begins styling that side');

    await stroke([[320, 670], [320, 460], [462, 460], [608, 460]]);
    const outer = await snapshot('right-outer-stroke');
    assert.ok(changed(crown, outer, lowerRightHair) > 300, 'Brushing the outer hair continues styling that side');

    const actions = [125, 874, 235, 901];
    const treatmentLabel = [225, 28, 415, 49];
    const rest = [298, 790, 342, 841];
    await stroke([[553, 730], [597, 645], [587, 550]]);
    const revealDeadline = Date.now() + 3000;
    let reveal;
    do {
      reveal = await snapshot('finished-portrait-hold');
    } while (count(reveal, treatmentLabel, pale) >= 30 && Date.now() < revealDeadline);
    assert.ok(changed(before, reveal, rest) >= 500, 'The styling brush leaves when both targets settle');
    assert.ok(count(reveal, treatmentLabel, pale) < 30, 'The treatment label clears before the finished portrait hold');
    assert.ok(count(reveal, actions, pale) < 100, 'The finished portrait is held before actions appear');
    assert.ok(changed(before, reveal, rightHair) > 5000, 'Finishing the right target settles its artwork');
    assert.equal(changed(leftSettled, reveal, lowerLeftHair, 0), 0,
      'A quick brush settles the left side fully while the other side is still unfinished');
    assert.equal(changed(before, reveal, eyes), 0, 'The finished hairstyle preserves the eyes and their makeup');
    assert.equal(changed(before, reveal, lips), 0, 'The finished hairstyle preserves the lips and their expression');
    assert.equal(changed(before, reveal, robe), 0, 'The finished hairstyle preserves already-visible clean silk');

    await wait(1000);
    const finished = await snapshot('finished-portrait-actions');
    assert.ok(count(finished, actions, pale) > 1500, 'Replay appears after the finished portrait hold');
    assert.ok(count(finished, [405, 874, 515, 901], pale) > 1500, 'Next appears beside Replay');

    await milestone(13);
    await release?.onFinished(finished);

    if(input==='mouse') {
      await tap(460,888); await wait(900);
      const dental=await snapshot('next-dental');
      assert.ok(changed(finished,dental,eyes)>20000,'Next enters the dental level');
      await tap(570,910); await wait(100); await tap(420,550); await wait(100); await tap(200,480); await wait(900);
    } else { await tap(180,888); await wait(800); }
    const replay = await snapshot('replay-dirty');
    await release?.onReplay(replay);
    assert.ok(changed(before,replay,eyes)>200, 'Replay restores the original face');
    const restarted = await snapshot();
    await down(320, 828);
    await holdPimples(move, pimples.slice(0, 1));
    await up();
    await wait(290);
    const extracted = await snapshot('replay-extraction');
    assert.ok(changed(restarted, extracted, [246, 219, 268, 247]) > 50,
      'Replay starts from the extractor and can treat the first pimple again');
    assert.deepEqual(errors, []);
  } finally {
    if (!release) await page.close();
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

module.exports = { checkFinish };

if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
