const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { PNG } = require('pngjs');
const { checkStage } = require('./launch.cjs');
const { checkMakeup } = require('./makeup.cjs');
const { checkFinish } = require('./finish.cjs');
const { play, checkProgress, checkGuidance, checkViewport } = require('./presentation.cjs');
const { cloud, key, launchChrome, open, savedRun, until, withPackage } = require('./packages.cjs');
const { aimPimple, holdPimples, pimples } = require('./stage-pointer.cjs');

const evidence = process.env.STAGE_EVIDENCE_DIR;
const targetByInput = { mouse: 'youtube', touch: 'playgama' };
const treatments = [
  'Extract pimples', 'Apply cleansing cream', 'Wipe face and neck', 'Clean robe',
  'Shave eyebrows', 'Apply lip scrub', 'Remove scrub and hydrate', 'Apply foundation',
  'Fill eyebrows', 'Apply eye makeup', 'Apply blush and contour', 'Apply crimson lipstick',
  'Style hair',
];

function verifyArtifacts(root, manifest) {
  const targets = Object.keys(manifest.packages);
  assert.deepEqual(targets.sort(), ['playgama', 'youtube']);
  assert.equal(manifest.sourceDirty, false, 'Both packages came from a clean checkout');
  const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
  for (const target of targets) {
    const entry = manifest.packages[target];
    const directory = path.join(root, target);
    const zip = fs.readFileSync(path.join(root, entry.file));
    assert.equal(zip.length, entry.compressedBytes);
    assert.equal(sha256(zip), entry.sha256);
    const names = fs.readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter(file => file.isFile())
      .map(file => path.relative(directory, path.join(file.parentPath, file.name)).replaceAll('\\', '/'))
      .sort();
    assert.deepEqual(names, entry.files.map(file => file.path).sort());
    assert.ok(!names.some(name => /fixture|runway-development/i.test(name)));
    const config = JSON.parse(fs.readFileSync(path.join(directory, 'playgama-bridge-config.json')));
    assert.equal(config.forciblySetPlatformId, target);
    assert.equal(config.sendAnalyticsEvents, false);
    assert.equal(config.debug, false);
    for (const file of entry.files) {
      const bytes = fs.readFileSync(path.join(directory, file.path));
      assert.equal(bytes.length, file.bytes, file.path);
      assert.equal(sha256(bytes), file.sha256, file.path);
    }
  }

  for (const file of manifest.packages.youtube.files.filter(file =>
    /^archive\/|^RunwayRewind[._]/.test(file.path))) {
    const equivalent = manifest.packages.playgama.files.find(candidate => candidate.path === file.path);
    assert.equal(file.sha256, equivalent?.sha256, `Shared game resource: ${file.path}`);
  }
}

function region(image, x, y, width, height) {
  const rows = Array.from({ length: height }, (_, row) => {
    const from = ((y + row) * image.width + x) * 4;
    return image.data.subarray(from, from + width * 4);
  });
  return Buffer.concat(rows);
}

function assertRestoredStage(expected, actual, message) {
  assert.ok(region(expected, 0, 0, 640, 861).equals(region(actual, 0, 0, 640, 861)), message);
  // Font antialiasing can round the action text differently after the page reload.
  for (let i = 861 * 640 * 4; i < expected.data.length; i += 4) {
    const delta = Math.abs(expected.data[i] - actual.data[i]) +
      Math.abs(expected.data[i + 1] - actual.data[i + 1]) +
      Math.abs(expected.data[i + 2] - actual.data[i + 2]);
    assert.ok(delta <= 6, message);
  }
}

async function reload(page) {
  await page.reload();
  await page.waitForFunction(() => window.hostEvents?.some(event => event.type === 'ready'));
  await wait(650);
}

async function checkCreamLifecycle(page, { canvas, beforeDrag, returned, down, move, up }) {
  const cheek = image => region(image, 185, 425, 102, 85);
  const read = async name => PNG.sync.read(await canvas.screenshot({
    path: name && evidence ? path.join(evidence, `mouse-${name}.png`) : undefined,
  }));
  await down(320, 828);
  await page.evaluate(() => window.hostPause(true));
  const draws = await page.evaluate(() => window.renders);
  await move(160, 478);
  await wait(260);
  assert.equal(await page.evaluate(() => window.renders), draws, 'Pausing with a held spatula suspends drawing');
  assert.ok(cheek(await read()).equals(cheek(returned)), 'The paused frame keeps the partial cream');
  await page.evaluate(() => window.hostPause(false));
  await move(295, 494);
  await wait(130);
  await up();
  await wait(400);
  const resumed = await read('cream-after-resume');
  assert.ok(cheek(resumed).equals(cheek(returned)), 'Resume keeps the same pixels without accepting stale movement');
  assert.ok(region(resumed, 353, 425, 102, 85).equals(region(returned, 353, 425, 102, 85)),
    'The suspended drag leaves the opposite cheek untouched');

  await reload(page);
  const restored = await read('cream-partial-reset-after-reload');
  assert.ok(cheek(restored).equals(cheek(beforeDrag)), 'A new visit restarts the unfinished cream treatment');
  assert.ok(region(restored, 246, 219, 22, 28).equals(region(beforeDrag, 246, 219, 22, 28)),
    'The same visit reload reconstructs the completed extraction');
}

async function fullRun(browser, root, input) {
  const target = targetByInput[input];
  const delayFinish = input === 'touch';
  let record = cloud(target, {});
  let releaseCompletion;
  const completionGate = new Promise(resolve => { releaseCompletion = resolve; });
  const milestones = [];
  const host = {
    read: async () => record,
    write: async next => {
      const save = JSON.parse((typeof next === 'string' ? JSON.parse(next) : next)[key]);
      const boundary = save.completedTreatments;
      assert.deepEqual(save, JSON.parse(savedRun(boundary)));
      milestones.push(boundary);
      if (boundary === 13 && delayFinish) await completionGate;
      record = next;
    },
  };
  return withPackage(path.join(root, target), url => open(browser, url, target, host, async page => {
    const canvas = page.locator('canvas');
    const read = async name => PNG.sync.read(await canvas.screenshot({
      path: name && evidence ? path.join(evidence, `${input}-${name}.png`) : undefined,
    }));
    const release = {
      page,
      async milestone(boundary) {
        await until(() => milestones.includes(boundary),
          `${input}: ${treatments[boundary - 1]} saves after settling`);
        assert.deepEqual(milestones, Array.from({ length: boundary }, (_, i) => i + 1),
          'Every treatment saves once and in order');
        console.log(`PASS ${input} ${boundary}/13: ${treatments[boundary - 1]}`);
      },
      duringCream: input === 'mouse' ? controls => checkCreamLifecycle(page, controls) : undefined,
      async onFinished(finished) {
        if (delayFinish) return;
        await reload(page);
        const restored = await read('completed-after-reload');
        assertRestoredStage(finished, restored,
          'Reload restores the same finished portrait and both actions');
      },
      async onReplay(replay) {
        if (delayFinish) {
          assert.equal(milestones.at(-1), 13, 'Replay waits for the in-flight completion write');
          releaseCompletion();
        }
        await until(() => milestones.at(-1) === 0, 'Replay saves a new empty run');
        await reload(page);
        const restored = await read('replay-reset-after-reload');
        assertRestoredStage(replay, restored,
          'The Replay reset wins after reload');
      },
    };
    try {
      await checkStage(browser, url, input, release);
      await checkMakeup(browser, url, input, release);
      await checkFinish(browser, url, input, release);
    } finally {
      releaseCompletion();
    }
  }, { hasTouch: input === 'touch' }));
}

async function checkToolMotion(page) {
  const canvas = page.locator('canvas');
  const read = async name => PNG.sync.read(await canvas.screenshot({
    path: name && evidence ? path.join(evidence, name + '.png') : undefined,
  }));
  const pause = value => page.evaluate(value => window.hostPause(value), value);
  const between = image => region(image, 420, 765, 180, 120);

  const dirty = await read();
  await page.mouse.click(320, 888, { delay: 45 });
  await wait(225);
  await pause(true);
  const arriving = await read('extractor-arriving');
  assert.ok(!between(arriving).equals(between(dirty)), 'The extractor crosses the stage before reaching its rest');
  assert.ok(region(arriving, 290, 770, 60, 85).equals(region(dirty, 290, 770, 60, 85)),
    'The resting position is empty during arrival');
  await pause(false);
  await wait(600);
  const rested = await read('extractor-at-rest');
  assert.ok(!region(arriving, 290, 770, 60, 85).equals(region(rested, 290, 770, 60, 85)),
    'The extractor comes to rest at the bottom of the stage');
  assert.ok(region(rested, 490, 765, 110, 95).equals(region(dirty, 490, 765, 110, 95)),
    'The extractor leaves the approach clear after arriving');

  // The last target is reached under a held pointer so the extractor exits
  // diagonally from the portrait toward the right edge of the stage.
  await page.mouse.move(320, 828);
  await page.mouse.down();
  await wait(50);
  const move = (x, y) => page.mouse.move(x, y);
  await holdPimples(move, pimples.slice(0, -1));
  await aimPimple(move, pimples.at(-1));
  await wait(1090);
  await pause(true);
  const exiting = await read('extractor-exiting');
  assert.ok(!region(exiting, 420, 620, 200, 200).equals(region(rested, 420, 620, 200, 200)),
    'The retiring extractor is visible on its way out');
  await pause(false);
  await page.mouse.up();
  await wait(900);
  const next = await read('spatula-after-extractor');
  assert.ok(region(next, 420, 620, 200, 200).equals(region(rested, 420, 620, 200, 200)),
    'The retiring extractor leaves the stage before the new tool rests');
}

async function focusedPresentation(browser, root) {
  const target = 'youtube';
  const cases = [
    [{ width: 640, height: 960 }, 'mouse', checkProgress],
    [{ width: 390, height: 844 }, 'touch', checkGuidance],
    [{ width: 960, height: 540 }, 'mouse', checkViewport],
    [{ width: 640, height: 640 }, 'touch', checkViewport],
  ];
  await withPackage(path.join(root, target), async url => {
    await open(browser, url, target, { read: async () => '', write: async () => {} }, checkToolMotion);
    for (const [viewport, input, check] of cases) {
      await open(browser, url, target, { read: async () => '', write: async () => {} },
        page => play(browser, url, viewport, input, check, page),
        { viewport, hasTouch: input === 'touch' });
    }
  });
  return cases.map(([{ width, height }, input]) => ({ width, height, input }));
}

async function main() {
  const root = path.resolve(process.argv[2] ?? '.scratch/releases');
  const modes = process.argv.slice(3);
  assert.ok(modes.every(mode => ['mouse', 'touch', 'presentation'].includes(mode)), 'Modes: mouse, touch, presentation');
  const run = mode => modes.length === 0 || modes.includes(mode);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package-manifest.json')));
  verifyArtifacts(root, manifest);
  if (evidence) fs.mkdirSync(evidence, { recursive: true });
  const browser = await launchChrome();
  try {
    const report = {
      host: `${os.type()} ${os.release()} ${os.arch()}`,
      browser: `Chrome ${browser.version()}`,
      sourceHead: manifest.sourceHead,
      zipSha256: Object.fromEntries(Object.entries(manifest.packages).map(([name, entry]) => [name, entry.sha256])),
      fullRuns: {},
    };
    for (const input of Object.keys(targetByInput)) {
      if (run(input)) {
        report.fullRuns[input] = {
          target: targetByInput[input],
          treatments,
          ...await fullRun(browser, root, input),
        };
      }
    }
    if (run('presentation')) {
      report.focusedPresentation = await focusedPresentation(browser, root);
      console.log('PASS: Focused release tool motion, progress, guidance, landscape, and square viewport checks.');
    }
    if (evidence) {
      const name = modes.length ? `acceptance-${modes.join('-')}.json` : 'acceptance.json';
      fs.writeFileSync(path.join(evidence, name), JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
