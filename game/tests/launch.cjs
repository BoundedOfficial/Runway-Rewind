const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { aimPimple, holdPimples, pimples: blemishes } = require('./stage-pointer.cjs');

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
const robeLeft = { left: 35, right: 105, top: 835, bottom: 910 };
const robeRight = { left: 520, right: 600, top: 835, bottom: 910 };
const looseHair = { left: 120, right: 132, top: 750, bottom: 762 };
const padCenter = { left: 307, right: 333, top: 815, bottom: 842 };
const darkHair = (r, g, b) => r < 85 && r > g && g > b;
const browLeft = { left: 194, right: 302, top: 299, bottom: 344 };
const browRight = { left: 338, right: 446, top: 299, bottom: 344 };
const eyes = { left: 190, right: 450, top: 355, bottom: 402 };
const lipsLeft = { left: 258, right: 302, top: 496, bottom: 538 };
const lipsRight = { left: 344, right: 382, top: 496, bottom: 538 };
const lipFrame = (x, y) => [320 + (x - 320) * 1.12, 480 + (y - 490) * 1.12];

function lipBounds({ left, top, right, bottom }) {
  const [x0, y0] = lipFrame(left, top);
  const [x1, y1] = lipFrame(right, bottom);
  return { left: Math.ceil(x0), top: Math.ceil(y0), right: Math.floor(x1), bottom: Math.floor(y1) };
}
const around = ([x, y]) => ({ left: x - 5, right: x + 6, top: y - 5, bottom: y + 6 });

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

async function checkStage(browser, url, input, release) {
  const page = release?.page ?? await browser.newPage({
    viewport: { width: 640, height: 960 },
    hasTouch: input === 'touch',
  });
  const milestone = release?.milestone ?? (async () => {});
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

    if (!release) {
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

    }

    const canvas = page.locator('canvas');
    const stage = await canvas.boundingBox();
    assert.ok(stage && Math.abs(stage.height / stage.width - 1.5) < 0.01, 'The game stage is portrait-oriented');
    const before = await snapshot(canvas, image => countPixels(image, button, cream) > 4500);
    assert.ok(before, 'The Start makeover prompt appears on the game stage');
    saveEvidence(input, 'before', before);
    if (release) release.dirty = PNG.sync.read(before);
    assert.ok(countPixels(PNG.sync.read(before), portrait, skin) > 2500,
      `The character is visible before Start (${errors.join(', ')})`);
    if (!release) await page.evaluate(() => Promise.race([
      window.gameReady,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Bridge did not receive GAME_READY')), 3000)),
    ]));

    const session = input === 'touch' && await page.context().newCDPSession(page);
    let point;
    async function move(x, y) {
      point = { x: stage.x + x * stage.width / 640, y: stage.y + y * stage.height / 960 };
      if (session) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, id: 0 }] });
      } else {
        await page.mouse.move(point.x, point.y);
      }
    }
    async function down(x, y) {
      if (session) {
        point = { x: stage.x + x * stage.width / 640, y: stage.y + y * stage.height / 960 };
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 0 }] });
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
    assert.ok(ready, 'The extractor arrives and rests at the bottom of the stage');
    await wait(450);
    const dirty = PNG.sync.read(await canvas.screenshot());
    if (release) {
      await down(320, 828);
      await move(85, 745);
      await move(86, 530);
      await up();
      await wait(350);
      const offTarget = PNG.sync.read(await canvas.screenshot());
      for (const blemish of blemishes) {
        assert.equal(changedPixels(dirty, offTarget, around(blemish)), 0,
          'Off-target movement leaves each pimple untouched');
      }
    }
    await down(320, 828);
    await aimPimple(move, blemishes[0]);
    await wait(180);
    if (release && session) {
      // A second contact moves from the second blemish to a third while the
      // primary contact stays on the first target.
      const primary = { ...point, id: 0 };
      const secondary = (x, y) => ({ x: stage.x + x, y: stage.y + y, id: 1 });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [primary, secondary(318, 283)],
      });
      await wait(65);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [primary, secondary(361, 294)],
      });
      await wait(65);
    }
    await wait(750);
    await up();
    await wait(350);
    const extractedFrame = await canvas.screenshot();
    const extracted = PNG.sync.read(extractedFrame);
    assert.ok(changedPixels(dirty, extracted, around(blemishes[0])) > 45,
      'Holding the extractor over one pimple clears it');
    for (const blemish of blemishes.slice(1)) {
      assert.equal(changedPixels(dirty, extracted, around(blemish)), 0,
        `The other pimple at ${blemish} remains untouched`);
    }
    assert.equal(changedPixels(dirty, extracted, toolRest), 0, 'The extractor returns after release');
    saveEvidence(input, 'extraction-one-target', extractedFrame);

    await down(320, 828);
    await holdPimples(move, blemishes.slice(1, -1));
    await up();
    await wait(350);
    const almost = PNG.sync.read(await canvas.screenshot());
    assert.equal(changedPixels(dirty, almost, around(blemishes.at(-1))), 0,
      'The final pimple still needs extraction');
    assert.equal(changedPixels(dirty, almost, toolRest), 0, 'The extractor stays until every target is clear');

    await down(320, 828);
    await holdPimples(move, blemishes.slice(-1));
    await up();
    await wait(1150);
    const startFrame = await canvas.screenshot();
    const beforeDrag = PNG.sync.read(startFrame);
    assert.ok(changedPixels(dirty, beforeDrag, toolRest) > 700, 'The cream spatula follows the extractor');
    for (const blemish of blemishes) {
      assert.ok(changedPixels(dirty, beforeDrag, around(blemish)) > 20,
        `Extraction visibly treats the pimple at ${blemish}`);
    }
    saveEvidence(input, 'cream-ready', startFrame);
    await milestone(1);
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
    if (release?.duringCream) {
      await release.duringCream({ canvas, beforeDrag, returned, down, up, move });
      // The new visit restores extraction, so repeat the partial cream stroke.
      await down(320, 828);
      await move(127, 690);
      await move(127, 478);
      await move(216, 478);
      await up();
      await wait(350);
    }

    // These strokes follow visible areas in portrait coordinates. The physical input is
    // offset from the tool's working tip by the fixed gameplay offset.
    async function sweep(points, project = (x, y) => [x, y]) {
      for (const [x, y] of points) {
        const [tipX, tipY] = project(x, y);
        await move(tipX - 28, tipY + 24);
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
    await milestone(2);

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
    await milestone(3);
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
    assert.ok(changedPixels(startup, cleaned, toolRest) > 800, 'The fabric pad follows the cotton wipe');
    await wait(250);
    assert.equal(changedPixels(cleaned, PNG.sync.read(await canvas.screenshot()), face, 0), 0,
      'The committed portrait stays stable while idle');

    await down(320, 828);
    await sweep([[44, 900], ...zigzag(35, 307, 656, 932, 46)]);
    await up();
    await wait(500);
    const leftRobeFrame = await canvas.screenshot();
    const leftRobe = PNG.sync.read(leftRobeFrame);
    assert.ok(changedPixels(cleaned, leftRobe, robeLeft) > 2500, 'The fabric pad visibly cleans the left side of the robe');
    assert.equal(changedPixels(cleaned, leftRobe, robeRight), 0, 'The other side of the robe still needs cleaning');
    assert.equal(changedPixels(cleaned, leftRobe, padCenter), 0, 'The fabric pad stays until both sides are cleaned');
    saveEvidence(input, 'robe-left-clean', leftRobeFrame);

    await down(320, 828);
    await sweep([[618, 890], ...zigzag(617, 337, 656, 932, 46)]);
    await up();
    await wait(1175);
    const robeFrame = await canvas.screenshot();
    const robe = PNG.sync.read(robeFrame);
    assert.ok(changedPixels(leftRobe, robe, robeRight) > 3000, 'The right side of the robe also cleans');
    assert.equal(changedPixels(cleaned, robe, portrait), 0, 'Cleaning the robe preserves the face');
    assert.ok(countPixels(robe, looseHair, darkHair) >= 115, 'Loose hair still crosses the clean silk');
    saveEvidence(input, 'robe-committed', robeFrame);
    await milestone(4);

    await down(320, 828);
    await sweep([[147, 448], [147, 309], ...zigzag(185, 306, 309, 343, 17)]);
    await up();
    await wait(500);
    const oneBrowFrame = await canvas.screenshot();
    const oneBrow = PNG.sync.read(oneBrowFrame);
    assert.ok(changedPixels(robe, oneBrow, browLeft) > 1200, 'The razor visibly shaves the first eyebrow');
    assert.equal(changedPixels(robe, oneBrow, browRight), 0, 'The other eyebrow remains unshaved');
    assert.equal(changedPixels(robe, oneBrow, eyes), 0, 'Shaving preserves the eyes');
    assert.equal(changedPixels(robe, oneBrow, toolRest), 0, 'The razor stays until both eyebrows are shaved');
    saveEvidence(input, 'one-eyebrow-shaved', oneBrowFrame);

    await down(320, 828);
    await sweep([[485, 449], [485, 309], ...zigzag(453, 334, 309, 343, 17)]);
    await up();
    await wait(350);
    const shavedFrame = await canvas.screenshot();
    const shaved = PNG.sync.read(shavedFrame);
    assert.ok(changedPixels(oneBrow, shaved, browRight) > 1200, 'The razor also shaves the second eyebrow');
    assert.equal(changedPixels(oneBrow, shaved, browLeft), 0, 'Shaving the second eyebrow preserves the first');
    assert.equal(changedPixels(robe, shaved, eyes), 0, 'The eyes stay intact after both eyebrows are shaved');
    saveEvidence(input, 'eyebrows-shaved', shavedFrame);
    await wait(850);
    await milestone(5);
    const scrubReady = PNG.sync.read(await canvas.screenshot());

    await down(320, 828);
    await sweep([[175, 655], [175, 517], [278, 517]], lipFrame);
    await up();
    await wait(400);
    const partialScrubFrame = await canvas.screenshot();
    const partialScrub = PNG.sync.read(partialScrubFrame);
    assert.ok(changedPixels(scrubReady, partialScrub, lipBounds(lipsLeft)) > 600, 'The scrub brush coats the lips under its tip');
    assert.equal(changedPixels(scrubReady, partialScrub, lipBounds(lipsRight)), 0, 'Scrub stays local to the stroke');
    assert.equal(changedPixels(scrubReady, partialScrub, toolRest), 0, 'The scrub brush returns after the first stroke');
    saveEvidence(input, 'lip-scrub-partial', partialScrubFrame);

    await down(320, 828);
    await sweep([[175, 655], [175, 503], ...zigzag(252, 389, 503, 540, 18)], lipFrame);
    await up();
    await wait(1175);
    const scrubFrame = await canvas.screenshot();
    const scrub = PNG.sync.read(scrubFrame);
    assert.ok(changedPixels(scrubReady, scrub, lipBounds(lipsRight)) > 800, 'The scrub settles across the rest of the lips');
    assert.equal(changedPixels(scrubReady, scrub, lipBounds(portrait)), 0, 'Applying scrub preserves the center of the face');
    saveEvidence(input, 'lip-scrub-committed', scrubFrame);
    await milestone(6);

    await down(320, 828);
    await sweep([[175, 655], [175, 517], [283, 517]], lipFrame);
    await up();
    await wait(400);
    const partialHydrationFrame = await canvas.screenshot();
    const partialHydration = PNG.sync.read(partialHydrationFrame);
    assert.ok(changedPixels(scrub, partialHydration, lipBounds(lipsLeft)) > 600, 'The sponge removes scrub and hydrates under its tip');
    assert.equal(changedPixels(scrub, partialHydration, lipBounds(lipsRight)), 0, 'Unwiped scrub stays visible on the far side');
    saveEvidence(input, 'lip-hydration-partial', partialHydrationFrame);

    await down(320, 828);
    await sweep([[174, 655], [174, 482], ...zigzag(230, 405, 482, 560, 26)], lipFrame);
    await up();
    await wait(1175);
    const hydratedFrame = await canvas.screenshot();
    const hydrated = PNG.sync.read(hydratedFrame);
    assert.ok(changedPixels(shaved, hydrated, lipsRight) > 600, 'Hydration reaches the full width of the lips');
    assert.equal(changedPixels(shaved, hydrated, eyes), 0, 'Hydration preserves the eyes');
    assert.ok(changedPixels(scrub, hydrated, toolRest) > 700, 'The sponge retires after hydration settles');
    // These RGB values come from the authored hydrated artwork at the feathered
    // scrub edge, where the cleaned result should be fully visible.
    for (const [x, y, expected] of [[254, 500, [176, 131, 99]], [333, 492, [187, 132, 109]],
      [320, 546, [167, 116, 88]], [385, 517, [169, 122, 86]]]) {
      const offset = (y * hydrated.width + x) * 4;
      const actual = [...hydrated.data.subarray(offset, offset + 3)];
      assert.ok(actual.every((channel, i) => Math.abs(channel - expected[i]) <= 5),
        `Hydration leaves the clean result at (${x}, ${y}), expected ${expected}, captured ${actual}`);
    }
    saveEvidence(input, 'lip-hydration-committed', hydratedFrame);
    await milestone(7);
    assert.deepEqual(errors, [], 'The package loads without browser or HTTP errors');
    if (!release) assert.deepEqual([...outbound], [], 'Standalone preview makes no cross-origin requests');

    saveEvidence(input, 'after', after);
    console.log(`PASS: ${input}, Start makeover, local resources, and all seven skincare treatments in order.`);
  } finally {
    if (!release) await page.close();
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

module.exports = { checkStage };

if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
