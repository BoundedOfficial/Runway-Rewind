const { enterLevel, tapStage } = require('./entry.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { pimples, extractionHold } = require('./stage-pointer.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const evidence = process.env.STAGE_EVIDENCE_DIR;
const blemish = { x: 246, y: 219, width: 22, height: 28 };
const cheek = { x: 185, y: 425, width: 102, height: 85 };
const otherCheek = { x: 353, y: 425, width: 102, height: 85 };
const portrait = { x: 55, y: 150, width: 530, height: 610 };
const replay = { x: 133, y: 874, width: 94, height: 27 };
const next = { x: 413, y: 874, width: 94, height: 27 };
const leftHair = [[90, 730], [91, 440], [171, 440], [171, 385], [111, 385],
  [111, 330], [180, 330], [180, 275], [110, 275], [118, 220], [174, 220], [163, 170], [126, 170]];
const rightHair = [[553, 730], [549, 440], [469, 440], [469, 385], [529, 385],
  [529, 330], [460, 330], [460, 275], [530, 275], [522, 220], [466, 220], [477, 170], [514, 170]];

async function frame(page, clip, name) {
  const bytes = clip ? await page.screenshot({ clip }) : await page.locator('canvas').screenshot();
  if (name && evidence) {
    fs.mkdirSync(evidence, { recursive: true });
    fs.writeFileSync(path.join(evidence, `${name}.png`), bytes);
  }
  return PNG.sync.read(bytes).data;
}

async function stroke(page, points, hold = 32) {
  await page.mouse.move(320, 828);
  await page.mouse.down();
  await wait(60);
  for (const [x, y] of points) {
    await page.mouse.move(x - 28, y + 24);
    await wait(hold);
  }
  await page.mouse.up();
}

async function ready(page) {
  await enterLevel(page);
}

async function open(browser, url, check) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
  });
  try {
    await check(page, url);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function start(page) {
  await page.mouse.click(320, 888, { delay: 70 });
  await wait(700);
}

function zigzag(left, right, first, last, step) {
  const points = [];
  for (let y = first; y <= last; y += step) {
    points.push([left, y], [right, y]);
    [left, right] = [right, left];
  }
  return points;
}

async function checkStandaloneReload(page, url) {
  await page.goto(url);
  await ready(page);
  const dirty = await frame(page, blemish);
  await start(page);
  await stroke(page, pimples, extractionHold);
  await wait(1400);
  const extracted = await frame(page, blemish);
  assert.ok(!extracted.equals(dirty), 'Extraction visibly clears the first pimple');
  const bareCheek = await frame(page, cheek);
  await stroke(page, [[155, 666], [155, 454], [244, 454], [90, 454]]);
  await wait(350);
  assert.ok(!(await frame(page, cheek)).equals(bareCheek), 'Partial cream visibly covers the left cheek');

  await page.reload();
  await ready(page);
  await wait(700);
  assert.ok((await frame(page, blemish)).equals(extracted), 'Reload reconstructs completed extraction');
  assert.ok((await frame(page, cheek)).equals(bareCheek), 'Reload clears incomplete cream');
  await frame(page, null, 'resumed-at-cleansing-cream');
  await stroke(page, [[155, 666], [155, 454], [244, 454], [90, 454]]);
  await wait(350);
  assert.ok(!(await frame(page, cheek)).equals(bareCheek), 'The returning player can use the cream tool immediately');

  await stroke(page, [[157, 690], [157, 375], ...zigzag(176, 299, 397, 587, 38)]);
  await wait(450);
  await stroke(page, [[510, 693], [510, 390], ...zigzag(444, 328, 400, 586, 38),
    [500, 390], [500, 250], ...zigzag(453, 187, 205, 347, 42)]);
  await wait(1500);
  const cream = await frame(page, cheek);
  const otherCream = await frame(page, otherCheek);
  await page.reload();
  await ready(page);
  await wait(700);
  assert.ok((await frame(page, cheek)).equals(cream), 'Reload reconstructs cream from the completed application');
  assert.ok((await frame(page, otherCheek)).equals(otherCream), 'Reload reconstructs cream on the opposite cheek');
  await frame(page, null, 'resumed-at-cleansing-wipe');
  await stroke(page, [[135, 700], [135, 466], [264, 466]]);
  await wait(350);
  assert.ok(!(await frame(page, cheek)).equals(cream), 'The returning player can wipe the restored cream');
  assert.ok((await frame(page, otherCheek)).equals(otherCream), 'The wipe leaves restored cream on the opposite cheek');
}

function savedRun(boundary) {
  return JSON.stringify({ version: 1, level: 'level-1', completedTreatments: boundary, completed: boundary === 13 });
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function waitFor(signal, message) {
  const timeout = new AbortController();
  try {
    return await Promise.race([signal.promise, wait(6000, null, { signal: timeout.signal }).then(() => assert.fail(message))]);
  } finally {
    timeout.abort();
  }
}

async function mockBridgeStorage(page, get, set) {
  await page.exposeFunction('hostLoad', get);
  await page.exposeFunction('hostSave', set);
  await page.route('**/playgama-bridge.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      window.bridge = {
        initialize: async () => { window.bridge.isInitialized = true; },
        EVENT_NAME: { PAUSE_STATE_CHANGED: 'pause', AUDIO_STATE_CHANGED: 'audio' },
        PLATFORM_MESSAGE: { GAME_READY: 'game_ready' },
        platform: {
          id: 'playgama',
          isPaused: false,
          isAudioEnabled: true,
          on: () => {},
          sendMessage: async () => {},
        },
        storage: { get: key => window.hostLoad(key), set: (key, value) => window.hostSave(value, key) },
      };
    `,
  }));
}

async function checkFailedLoad(page, url) {
  let stored = savedRun(13);
  let first = true;
  let attempts = 0;
  const retry = deferred();
  const allowRetry = deferred();
  await mockBridgeStorage(page, async () => {
    if (first) {
      first = false;
      throw new Error('The platform rejected the initial load');
    }
    retry.resolve();
    await allowRetry.promise;
    return stored;
  }, async value => {
    attempts++;
    stored = value;
  });

  await page.goto(url);
  await ready(page);
  const dirty = await frame(page, blemish);
  await start(page);
  await stroke(page, pimples, extractionHold);
  await wait(1000);
  const extracted = await frame(page, blemish);
  assert.ok(!dirty.equals(extracted), 'An initial load failure leaves extraction playable');
  assert.equal(attempts, 0, 'An unknown save is protected while recovery is pending');
  await waitFor(retry, 'The failed initial load never retried');
  allowRetry.resolve();
  await wait(300);
  assert.ok((await frame(page, blemish)).equals(extracted), 'The recovered save does not replace the active portrait');
  const bareCheek = await frame(page, cheek);
  await stroke(page, [[155, 666], [155, 454], [244, 454], [90, 454]]);
  await wait(320);
  assert.ok(!(await frame(page, cheek)).equals(bareCheek), 'The current run remains playable after recovery');

  await page.reload();
  await ready(page);
  assert.ok((await frame(page, blemish)).equals(dirty), 'Selecting the protected completed level starts a fresh replay');
}

async function checkSlowLoad(page, url) {
  let stored = null;
  const allowLoad = deferred();
  const saved = deferred();
  await mockBridgeStorage(page, async () => {
    await allowLoad.promise;
    return stored;
  }, async value => {
    stored = value;
    saved.resolve();
  });

  await page.goto(url);
  await ready(page);
  const dirty = await frame(page, blemish);
  await start(page);
  await stroke(page, pimples, extractionHold);
  await wait(1000);
  const extracted = await frame(page, blemish);
  assert.ok(!dirty.equals(extracted), 'An unresolved load leaves the current visit playable');
  assert.equal(stored, null, 'A delayed initial load holds writes even after the stage opens');
  allowLoad.resolve();
  await waitFor(saved, 'Progress did not save after confirming there was no existing save');

  await page.reload();
  await ready(page);
  assert.ok((await frame(page, blemish)).equals(extracted), 'Progress made during a slow initial load survives reload');
}

async function finishHair(page) {
  await wait(700);
  await stroke(page, [[85, 750], [85, 355], [122, 355], [155, 338]]);
  await wait(340);
  await stroke(page, leftHair);
  await wait(900);
  await stroke(page, rightHair);
  await wait(1850);
}

function lightPixels(image) {
  let count = 0;
  for (let i = 0; i < image.length; i += 4) {
    if (image[i] > 245 && image[i + 1] > 218 && image[i + 2] > 193) count++;
  }
  return count;
}

async function checkFailedSave(page, url) {
  let stored = savedRun(12);
  let first = true;
  let reloading = false;
  const saved = deferred();
  const restarted = deferred();
  const reloadStarted = deferred();
  const allowReload = deferred();
  await mockBridgeStorage(page, async () => {
    if (reloading) {
      reloadStarted.resolve();
      await allowReload.promise;
    }
    return stored;
  }, async value => {
    if (first) {
      first = false;
      throw new Error('The platform rejected the completion save');
    }
    stored = value;
    if (reloading) restarted.resolve();
    else saved.resolve();
  });
  await page.goto(url);
  await ready(page);
  const unstyled = await frame(page, portrait);
  await finishHair(page);
  const finished = await frame(page, portrait);
  assert.ok(!finished.equals(unstyled), 'The styling treatments remain visible during a failed save');
  assert.ok(lightPixels(await frame(page, replay)) > 1500, 'Replay is available during a failed save');
  assert.ok(lightPixels(await frame(page, next)) > 1500, 'Next is available during a failed save');
  await waitFor(saved, 'Completion did not save after a temporary failure');

  reloading = true;
  await page.reload();
  const entering = ready(page);
  await waitFor(reloadStarted, 'Selection did not request the completed makeover');
  allowReload.resolve();
  await entering;
  await waitFor(restarted, 'Selecting the completed level did not save a replay reset');
  assert.ok(!(await frame(page, portrait)).equals(finished), 'Completed level selection begins a fresh replay');

}

async function checkReplayOrdering(page, url) {
  let stored = savedRun(12);
  const finishing = deferred();
  const allowFinish = deferred();
  const reset = deferred();
  await mockBridgeStorage(page, async () => stored, async value => {
    if (JSON.parse(value).completed) {
      finishing.resolve();
      await allowFinish.promise;
      stored = value;
    } else {
      stored = value;
      reset.resolve();
    }
  });

  await page.goto(url);
  await ready(page);
  await finishHair(page);
  await waitFor(finishing, 'The completion save did not reach the platform');
  await page.mouse.click(180, 888, { delay: 70 });
  await wait(900);
  const dirty = await frame(page, portrait);
  allowFinish.resolve();
  await waitFor(reset, 'Replay did not save the reset after the completion write');
  await page.reload();
  await ready(page);
  assert.ok((await frame(page, portrait)).equals(dirty), 'Replay wins over the delayed completion save after reload');
  await frame(page, null, 'replay-reset-after-delayed-completion');
  const dirtyBlemish = await frame(page, blemish);
  await start(page);
  await stroke(page, pimples.slice(0, 1), extractionHold);
  await wait(250);
  assert.ok(!(await frame(page, blemish)).equals(dirtyBlemish), 'Replay starts a fresh run at extraction');
}

async function main() {
  assert.ok(process.argv[2], 'Pass the directory of the HTML5 bundle');
  const server = preview(process.argv[2]);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    try {
      const url = `http://127.0.0.1:${server.address().port}/`;
      await open(browser, url, checkStandaloneReload);
      console.log('PASS: Standalone reload restores extraction and completed cream, and resets partial cream.');
      await open(browser, url, checkFailedLoad);
      console.log('PASS: A failed load retries without overwriting prior progress or replacing the active run.');
      await open(browser, url, checkSlowLoad);
      console.log('PASS: A slow initial load allows play and later saves the session after confirming an empty record.');
      await open(browser, url, checkFailedSave);
      console.log('PASS: A failed completion save leaves the result playable and retries successfully.');
      await open(browser, url, checkReplayOrdering);
      console.log('PASS: A delayed completion write cannot undo a newer Replay reset.');
    } finally {
      await browser.close();
    }
  } finally {
    server.close();
  }
}

module.exports = { mockBridgeStorage, deferred, waitFor, savedRun };
if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
