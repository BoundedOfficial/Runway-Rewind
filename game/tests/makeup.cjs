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

function changed(before, after, [left, top, right, bottom], tolerance = 15) {
  let count = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const offset = (y * before.width + x) * 4;
      const difference = [0, 1, 2].reduce((sum, channel) =>
        sum + Math.abs(before.data[offset + channel] - after.data[offset + channel]), 0);
      if (difference > tolerance) count++;
    }
  }
  return count;
}

function crimson(image, [left, top, right, bottom]) {
  let count = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const offset = (y * image.width + x) * 4;
      const [red, green, blue] = image.data.subarray(offset, offset + 3);
      if (red - green > 55 && red - blue > 28) count++;
    }
  }
  return count;
}

async function checkMakeup(browser, url, input, release) {
  const page = release?.page ?? await browser.newPage({
    viewport: { width: 640, height: 960 },
    hasTouch: input === 'touch',
  });
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
    async function sweep(points, scale, centerY) {
      for (const [x, y] of points) {
        await move(320 + (x - 320) * scale - 28, 480 + (y - centerY) * scale + 24);
      }
    }
    async function stroke(points, scale = 1, centerY = 480) {
      await down(320, 828);
      await sweep(points, scale, centerY);
      await up();
    }
    async function snapshot(name) {
      const bytes = await canvas.screenshot();
      if (name && evidence) {
        fs.mkdirSync(evidence, { recursive: true });
        fs.writeFileSync(path.join(evidence, `${input}-${name}.png`), bytes);
      }
      return PNG.sync.read(bytes);
    }
    if (!release) {
      await page.waitForFunction(() => window.bridge?.isInitialized);
      const deadline = Date.now() + 10000;
      let startup;
      do {
        startup = await snapshot();
      } while (startup.data[(878 * startup.width + 320) * 4] < 244 && Date.now() < deadline);
      assert.ok(startup.data[(878 * startup.width + 320) * 4] >= 244, 'Start makeover appears');
      await down(320, 888);
      await up();
      await wait(600);
    }

    const before = await snapshot('completed-skincare');
    await down(320, 828);
    await move(292, 734);
    await move(292, 653);
    await move(235, 653);
    await up();
    await wait(300);
    const partial = await snapshot('partial-foundation-neck');
    assert.ok(changed(before, partial, [265, 613, 375, 713]) > 300,
      'The first makeup tool applies visible foundation to the neck');
    assert.equal(changed(before, partial, [230, 205, 410, 290]), 0,
      'A neck stroke leaves the forehead untouched');
    assert.equal(changed(before, partial, [300, 817, 340, 854]), 0,
      'The foundation tool returns to rest while its work stays visible');

    await stroke([
      [260, 750], [366, 750], [366, 703], [260, 703], [255, 653], [390, 653],
      [390, 602], [250, 602], [215, 558], [430, 558], [447, 509], [202, 509],
      [192, 461], [455, 461], [463, 413], [184, 413], [168, 364], [468, 364],
      [451, 316], [181, 316], [188, 269], [448, 269], [417, 222], [220, 222],
      [252, 181], [392, 181],
    ]);
    await wait(1350);
    const foundation = await snapshot('foundation-settled');
    await milestone(8);
    assert.ok(changed(before, foundation, [228, 225, 405, 285]) > 1000,
      'Foundation visibly covers the face as well as the neck');
    assert.equal(changed(before, foundation, [12, 20, 130, 210]), 0,
      'Foundation leaves the surrounding hair and backdrop intact');

    await stroke([[115, 730], [144, 357], [178, 348], [309, 348], [309, 325],
      [178, 325], [178, 301], [308, 301]]);
    await wait(400);
    const leftBrow = await snapshot('left-brow-settled');
    assert.ok(changed(foundation, leftBrow, [188, 302, 216, 345]) > 70,
      'Brow fill reaches the outer tail of the treated eyebrow');
    assert.equal(changed(foundation, leftBrow, [342, 295, 447, 347]), 0,
      'The other eyebrow remains untouched');

    await stroke([[550, 735], [490, 363], [462, 348], [331, 348], [331, 325],
      [462, 325], [462, 301], [332, 301]]);
    await wait(1350);
    const brows = await snapshot('both-brow-tails-settled');
    await milestone(9);
    await down(320, 828);
    await sweep([[114, 735], [148, 385], [186, 353], [243, 353]], 1.18, 410);
    await snapshot('held-eye-brush');
    await sweep([[303, 353], [302, 389], [185, 389], [218, 412], [282, 412]], 1.18, 410);
    await up();
    await wait(450);
    const leftEye = await snapshot('combined-left-eye');
    assert.ok(changed(brows, leftEye, [177, 407, 234, 432]) > 130,
      'A sweep over the enlarged eye reveals the wing and lashes');
    assert.ok(changed(brows, leftEye, [205, 401, 267, 416]) > 110,
      'The same sweep reveals the shadow');
    assert.equal(changed(brows, leftEye, [364, 399, 474, 458]), 0,
      'Applying the combined look to one eye leaves the other eye untouched');

    await stroke([
      [526, 735], [492, 385], [454, 353], [337, 353], [338, 389], [455, 389], [422, 412], [358, 412],
    ], 1.18, 410);
    await wait(1350);
    const eyes = await snapshot('combined-eyes-settled');
    await milestone(10);

    await stroke([[130, 726], [133, 467], [193, 442], [264, 421], [264, 446]]);
    await wait(400);
    const leftBlush = await snapshot();
    assert.ok(changed(eyes, leftBlush, [199, 410, 265, 460]) > 250,
      'The blush brush adds color to the treated cheek');
    assert.equal(changed(eyes, leftBlush, [375, 410, 436, 460]), 0,
      'Blush on one cheek leaves the other cheek untouched');
    await stroke([[525, 726], [500, 470], [449, 441], [379, 421], [379, 445],
      [339, 438], [337, 401], [306, 400], [304, 456]]);
    await wait(200);
    const sculpted = await snapshot();
    assert.ok(changed(eyes, sculpted, [375, 410, 436, 460]) > 250,
      'The same blush tool applies color on the second cheek');
    assert.ok(changed(eyes, sculpted, [288, 398, 350, 465]) > 250,
      'The same blush tool reveals contour around the nose');

    await wait(1100);
    const lipstickReady = await snapshot('blush-and-contour-settled');
    await milestone(11);
    await stroke([[196, 725], [197, 534], [259, 523], [288, 515]], 1.12, 490);
    await wait(350);
    const partialLip = await snapshot('partial-lipstick-close-up');
    assert.ok(crimson(partialLip, [260, 490, 306, 535]) >
      crimson(lipstickReady, [260, 490, 306, 535]) + 150,
      'A close-up stroke adds crimson color to the targeted lip area');
    assert.equal(changed(lipstickReady, partialLip, [353, 498, 381, 532]), 0,
      'The far edge of the lips retains its color until the tool reaches it');

    await stroke([[244, 675], [258, 528], [374, 527], [374, 505], [258, 505]], 1.12, 490);
    const framingDeadline = Date.now() + 2800;
    const backdrop = [12, 20, 130, 210];
    let finished;
    do {
      await wait(80);
      finished = await snapshot('makeup-settled');
    } while (changed(eyes, finished, backdrop) > 0 && Date.now() < framingDeadline);
    assert.ok(crimson(finished, [260, 495, 380, 536]) > 900,
      'The lipstick treatment settles into crimson across the lips');
    assert.equal(changed(eyes, finished, backdrop), 0,
      'The stage returns to the full portrait with the backdrop intact');
    await milestone(12);
    assert.deepEqual(errors, []);
  } finally {
    if (!release) await page.close();
  }
}

async function main() {
  assert.ok(process.argv[2], 'Pass the directory of the debug makeup fixture bundle');
  const server = preview(process.argv[2]);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      await checkMakeup(browser, url, 'mouse');
      await checkMakeup(browser, url, 'touch');
      console.log('Makeup passed with mouse and simulated touch.');
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

module.exports = { checkMakeup };

if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
