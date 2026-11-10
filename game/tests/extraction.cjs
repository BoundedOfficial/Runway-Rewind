const { enterLevel, tapStage } = require('./entry.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { createStagePointer, pimples } = require('./stage-pointer.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidence = process.env.STAGE_EVIDENCE_DIR;
const [first, second, third] = pimples;

async function frame(page, name) {
  const bytes = await page.screenshot();
  if (name && evidence) {
    fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(path.join(evidence, `${name}.png`), bytes);
  }
  return PNG.sync.read(bytes);
}

function changedPixels(before, after, [cx, cy], radius = 5) {
  let changed = 0;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const offset = 4 * (y * before.width + x);
      const difference = [0, 1, 2].reduce((sum, c) =>
        sum + Math.abs(before.data[offset + c] - after.data[offset + c]), 0);
      if (difference > 18) changed++;
    }
  }
  return changed;
}

function freshSprayPixels(before, after, [cx, cy]) {
  const spray = (data, i) => (data[i] > 225 && data[i + 1] > 195 && data[i + 2] > 148) ||
    (data[i] > 100 && data[i] > data[i + 1] * 1.7 && data[i] > data[i + 2] * 1.5);
  let count = 0;
  for (let y = cy - 40; y <= cy + 10; y++) {
    for (let x = cx - 40; x <= cx + 40; x++) {
      if (Math.abs(x - cx) < 10) continue; // Exclude the extractor itself.
      const i = 4 * (y * before.width + x);
      if (!spray(before.data, i) && spray(after.data, i)) count++;
    }
  }
  return count;
}

async function checkExtraction(browser, url, input) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 }, hasTouch: input === 'touch' });
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
    });
    await page.goto(url);
    await enterLevel(page);
    const pointer = await createStagePointer(page, input, (x, y) => ({ x, y }), { moveDelay: 32, downDelay: 42 });
    const pickUp = () => pointer.down(320, 828);
    const aim = ([x, y], dx = 0, dy = 0) => pointer.move(x - 28 + dx, y + 24 + dy);
    await pointer.down(320, 888);
    await pointer.up();
    await wait(650);
    const ready = await frame(page, `${input}-ready`);
    await pickUp();
    await aim(first);
    await wait(290);
    await pointer.up();
    await wait(475);
    const cancelled = await frame(page, `${input}-early-release`);
    assert.equal(changedPixels(ready, cancelled, first, 12), 0,
      'Releasing during the press leaves the pimple and its guide intact');

    const platformFocus = focused => page.evaluate(focused => {
      window.dispatchEvent(new Event(focused ? 'focus' : 'blur'));
    }, focused);
    await pickUp();
    await aim(first);
    await wait(85);
    await platformFocus(false);
    const paused = await frame(page);
    await aim(second);
    await wait(550);
    assert.ok((await frame(page)).data.equals(paused.data), 'The tool stops mid-approach during a platform pause');
    await platformFocus(true);
    await aim(second);
    await wait(470);
    await pointer.up();
    const resumed = await frame(page, `${input}-resumed-after-cancel`);
    assert.equal(changedPixels(ready, resumed, first, 12), 0, 'A paused approach does not pop on resume');
    assert.equal(changedPixels(ready, resumed, second, 12), 0, 'Stale input cannot start a new press on resume');

    await pickUp();
    const started = performance.now();
    const captureAt = async (ms, phase) => {
      await wait(Math.max(0, ms - (performance.now() - started)));
      const requestedAt = Math.round(performance.now() - started);
      const image = await frame(page, `${input}-${phase}`);
      if (evidence) console.log(`${input} ${phase} screenshot requested at +${requestedAt} ms`);
      return image;
    };
    await aim(first, 10, 3);
    const approach = await captureAt(80, 'approach');
    await aim(second);
    await aim(third);
    const press = await captureAt(350, 'press');
    const retract = await captureAt(675, 'retract');
    const toolArea = [267, 308];
    assert.ok(changedPixels(ready, approach, toolArea, 29) > 80, 'The extractor approaches the selected pimple');
    assert.ok(changedPixels(approach, press, toolArea, 29) > 80, 'The extractor visibly shifts into a press at the first target');
    assert.ok(changedPixels(press, retract, toolArea, 29) > 80, 'The extractor visibly lifts away after the press');
    assert.ok(changedPixels(ready, retract, first, 2) > 14, 'The pimple begins clearing as the extractor lifts');

    // The pointer is still over the third pimple, where the fast swipe ended.
    await wait(1000);
    const stillHeld = await frame(page, `${input}-cycle-ended`);
    assert.ok(changedPixels(ready, stillHeld, first) > 45, 'A completed press visibly clears the pimple');
    assert.equal(changedPixels(ready, stillHeld, second), 0, 'The swipe leaves the crossed pimple intact');
    assert.equal(changedPixels(ready, stillHeld, third), 0, 'The swipe does not queue a press where it ends');

    // An intentional new movement can start a second cycle. Pausing and releasing
    // during the lift must keep the result of its committed press.
    await aim(second);
    await wait(515);
    await platformFocus(false);
    const pausedLift = await frame(page, `${input}-paused-pop`);
    assert.ok(freshSprayPixels(ready, pausedLift, second) >= 24,
      'The red-and-ivory spray visibly bursts from the pimple as the extractor lifts');
    await pointer.up();
    await wait(300);
    assert.ok((await frame(page)).data.equals(pausedLift.data), 'A platform pause also freezes the lift');
    await platformFocus(true);
    await wait(725);
    const returned = await frame(page, `${input}-two-targets-returned`);
    assert.ok(changedPixels(ready, returned, first) > 45, 'The first result persists after release');
    assert.ok(changedPixels(ready, returned, second) > 45, 'The second result persists through pause and release');
    assert.equal(freshSprayPixels(ready, returned, second), 0, 'The splat clears as the pimple settles');
    assert.equal(changedPixels(ready, returned, third, 12), 0, 'The untouched pimple keeps its guide');
    assert.equal(changedPixels(ready, returned, [320, 837], 26), 0, 'The extractor returns to its resting position');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function main() {
  const bundle = process.argv[2] ?? path.join(__dirname, '../dist/html5/Runway Rewind');
  const server = preview(bundle);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      for (const input of ['mouse', 'touch']) await checkExtraction(browser, url, input);
      console.log('PASS: Extraction phases, one-target lock, and pause and release with mouse and simulated touch.');
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
