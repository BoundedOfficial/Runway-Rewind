const { enterLevel } = require('./entry.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { holdPimples, pimples } = require('./stage-pointer.cjs');

const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const key = 'runway-rewind.level-1';
const sdkUrls = {
  youtube: 'https://www.youtube.com/game_api/v1',
  playgama: 'https://playgama.com/platform-sdk/v1.js',
};
const blemish = { x: 246, y: 219, width: 22, height: 28 };
const savedRun = boundary => JSON.stringify({
  version: 1, level: 'level-1', completedTreatments: boundary, completed: boundary === 13,
});

function hostSdk(target) {
  const events = window.hostEvents = [];
  const loading = () => Boolean(document.querySelector('#game-loading')?.getClientRects().length);
  const gameReady = () => events.push({ type: 'ready', loading: loading(), renders: window.renders });
  if (target === 'youtube') {
    let pause, resume, audio;
    window.hostPause = value => (value ? pause : resume)();
    window.hostAudio = value => audio(value);
    window.ytgame = {
      system: {
        getLanguage: async () => 'en-US',
        isAudioEnabled: () => false,
        onAudioEnabledChange: callback => { audio = callback; },
        onPause: callback => { pause = callback; },
        onResume: callback => { resume = callback; },
      },
      game: {
        firstFrameReady: () => {
          events.push({ type: 'first-frame', loading: loading() });
          if (window.hostPauseAtStartup) pause();
        },
        gameReady,
        loadData: async () => window.hostRead(),
        saveData: async value => window.hostWrite(value),
      },
    };
  } else {
    window.PLAYGAMA_SDK = {
      advService: { subscribeToAdStateChanges() {} },
      platformService: {
        isReady: Promise.resolve(),
        getLanguage: () => 'en',
        getIsCloudSaveSupported: () => window.hostCloudAvailable,
      },
      gameService: { gameReady },
      cloudSaveApi: {
        getState: async () => window.hostRead(),
        setItems: async value => window.hostWrite(value),
      },
      storageApi: {
        setItems: value => events.push({ type: 'local-write', value }),
        deleteItems: keys => events.push({ type: 'local-delete', keys }),
      },
    };
  }
}

async function snapshot(page) {
  return PNG.sync.read(await page.screenshot({ clip: blemish })).data;
}

async function start(page) {
  await page.mouse.click(320, 888, { delay: 70 });
  await wait(650);
}

async function until(predicate, message) {
  const deadline = Date.now() + 9000;
  while (!predicate() && Date.now() < deadline) await wait(40);
  assert.ok(predicate(), message);
}

async function extract(page, points = pimples) {
  await page.mouse.move(320, 828);
  await page.mouse.down();
  await wait(65);
  await holdPimples((x, y) => page.mouse.move(x, y), points);
  await page.mouse.up();
  await wait(900);
}

async function open(browser, url, target, host, check, pageOptions = {}) {
  const page = await browser.newPage({ viewport: { width: 640, height: 960 }, ...pageOptions });
  const errors = [];
  const warnings = [];
  const requests = [];
  const sdk = sdkUrls[target];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const responses = new Map();
  let transfer = 0;
  cdp.on('Network.responseReceived', ({ requestId, response }) => responses.set(requestId, response.url));
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    if (responses.get(requestId)?.startsWith(url)) transfer += encodedDataLength;
  });

  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' || /ERROR:/.test(message.text())) errors.push(message.text());
    if (message.type() === 'warning') warnings.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => errors.push(`${request.url()} ${request.failure()?.errorText}`));
  page.on('websocket', socket => errors.push(`Unexpected WebSocket ${socket.url()}`));
  await page.exposeFunction('hostRead', host.read);
  await page.exposeFunction('hostWrite', host.write);
  await page.addInitScript(({ key, cloud, pauseAtStartup }) => {
    window.hostCloudAvailable = cloud;
    window.hostPauseAtStartup = pauseAtStartup;
    window.renders = 0;
    for (const gl of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const clear = gl.prototype.clear;
      gl.prototype.clear = function (...args) {
        window.renders++;
        return clear.apply(this, args);
      };
    }
    // Simulate an unrelated legacy browser value. The cloud record owns progress.
    if (localStorage.getItem(key) === null) localStorage.setItem(key, 'legacy-local-value');
  }, { key, cloud: host.cloud !== false, pauseAtStartup: host.pauseAtStartup === true });
  await page.route('**/*', async route => {
    const address = route.request().url();
    requests.push(address);
    // Playgama's downstream host wrapper supplies the required YouTube SDK.
    // Simulate that wrapper around the same auto-detect distribution, without
    // producing or modifying a separate YouTube release artifact.
    if (target === 'youtube' && address === url) {
      const response = await route.fetch();
      const body = (await response.text()).replace('<script src="playgama-bridge.js">',
        '<script src="https://www.youtube.com/game_api/v1"></script><script src="playgama-bridge.js">');
      return route.fulfill({response, body});
    }
    if (address.endsWith('/playgama-bridge-config.json')) return route.fulfill({contentType:'application/json',body:JSON.stringify({forciblySetPlatformId:target,sendAnalyticsEvents:false,debug:false})});
    if (address === sdk) return route.fulfill({
      contentType: 'application/javascript',
      body: `(${hostSdk.toString()})(${JSON.stringify(target)});`,
    });
    if (address.startsWith(url)) return route.continue();
    return route.abort();
  });
  try {
    const startTime = Date.now();
    assert.ok((await page.goto(url))?.ok());
    if (host.pauseAtStartup) {
      await page.waitForFunction(() => window.hostEvents?.some(event => event.type === 'first-frame'));
      await wait(230);
      assert.ok(!requests.some(address => address.endsWith('.wasm') || address.includes('/archive/')),
        'A startup pause defers engine and archive requests');
      await page.evaluate(() => window.hostPause(false));
    }
    await page.waitForFunction(() => window.hostEvents?.some(event => event.type === 'ready'), null, { timeout: 12000 });
    const elapsed = Date.now() - startTime;
    const startupTransfer = transfer;
    const heap = await cdp.send('Runtime.getHeapUsage');
    assert.equal(await page.evaluate(() => window.bridge.platform.id), target);
    const events = await page.evaluate(() => window.hostEvents);
    const ready = events.filter(event => event.type === 'ready');
    assert.equal(ready.length, 1);
    assert.equal(ready[0].loading, false);
    assert.ok(ready[0].renders > 0, 'The interactive stage has drawn before the host ready signal');
    assert.equal(await page.locator('#development-controls').count(), 0);
    assert.ok(requests.some(address => address.endsWith('.wasm')), 'The engine loaded');
    assert.ok(requests.some(address => address.includes('/archive/')), 'The game archive loaded');
    assert.ok(requests.indexOf(sdk) < requests.findIndex(address => address.endsWith('.wasm')),
      'The host SDK loads before the engine');
    if (target === 'youtube') {
      assert.deepEqual(events[0], { type: 'first-frame', loading: true });
      assert.ok(requests.indexOf(sdk) < requests.indexOf(url + 'playgama-bridge.js'));
      assert.ok(startupTransfer < 30 * 1024 * 1024, 'Initial local transfer is under 30 MiB');
      assert.ok(heap.usedSize < 512 * 1024 * 1024, 'Sampled JS heap is under 512 MiB');
    }
    await enterLevel(page);
    await check(page, warnings);
    assert.deepEqual([...new Set(requests.filter(address => !address.startsWith(url)))], [sdk]);
    assert.deepEqual(errors, [], 'The package runs without browser or resource errors');
    const storage = await page.evaluate(key => ({
      local: localStorage.getItem(key),
      localCalls: window.hostEvents.filter(event => event.type.startsWith('local-')),
    }), key);
    assert.deepEqual(storage, { local: 'legacy-local-value', localCalls: [] }, 'Cloud progress never migrates or falls back to local storage');
    return {
      elapsedMs: elapsed,
      localInitialTransferBytes: startupTransfer,
      sampledReadyJsHeapBytes: heap.usedSize,
      requests: [...new Set(requests)].map(address => address.startsWith(url) ? address.slice(url.length) || '/' : address),
    };
  } finally {
    await page.close();
  }
}

function cloud(target, state) {
  return target === 'youtube' ? JSON.stringify(state) : state;
}

async function checkLifecycle(page, target, observations) {
  const renderCount = () => page.evaluate(() => window.renders);
  const lifecycle = type => page.evaluate(type => {
    if (window.hostPause) window.hostPause(type === 'blur');
    else window.dispatchEvent(new Event(type));
  }, type);

  if (target === 'youtube') {
    assert.equal(await page.evaluate(() => window.bridge.platform.isAudioEnabled), false);
    await page.evaluate(() => window.hostAudio(true));
    assert.equal(await page.evaluate(() => window.bridge.platform.isAudioEnabled), true);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const drawn = await renderCount();
    await wait(160);
    assert.ok(await renderCount() > drawn, 'Browser blur cannot pause the YouTube adapter');
  }

  await start(page);
  const before = await snapshot(page);
  await page.mouse.move(320, 828);
  await page.mouse.down();
  await wait(65);
  await lifecycle('blur');
  const rendered = await renderCount();
  const requests = observations.reads;
  if (target === 'youtube') await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.mouse.move(229, 256);
  await wait(350);
  assert.equal(await renderCount(), rendered, 'Host pause suspends WebGL drawing');
  assert.equal(observations.reads, requests, 'Host pause starts no storage requests');
  assert.ok((await snapshot(page)).equals(before), 'Pause preserves the portrait while the tool is held');
  await lifecycle('focus');
  await page.mouse.move(231, 257);
  await wait(120);
  await page.mouse.up();
  await wait(350);
  assert.ok((await snapshot(page)).equals(before), 'The suspended drag cannot apply treatment on resume');
  await extract(page, pimples.slice(0, 1));
  assert.ok(!(await snapshot(page)).equals(before), 'A fresh pickup applies treatment after resume');
}

async function withPackage(bundle, check) {
  const server = preview(bundle);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  // A mapped local hostname also exercises Bridge's production telemetry path.
  const url = `http://runway.test:${server.address().port}/`;
  try {
    return await check(url);
  } finally {
    server.close();
  }
}

async function verify(browser, target, bundle) {
  return withPackage(bundle, async url => {
    const observations = { reads: 0 };
    const evidence = await open(browser, url, target, {
      read: async () => {
        observations.reads++;
        return target === 'youtube' ? '' : {};
      },
      write: async () => assert.fail('Incomplete treatments should not be saved'),
    }, async page => {
      if (process.env.PACKAGE_EVIDENCE_FILE) {
        await page.locator('canvas').screenshot({
          path: path.join(path.dirname(process.env.PACKAGE_EVIDENCE_FILE), `${target}-start.png`),
        });
      }
      await checkLifecycle(page, target, observations);
    });
    console.log(`PASS: ${target} startup, resource requests, readiness, and lifecycle`);

    if (target === 'youtube') {
      await open(browser, url, target, {
        pauseAtStartup: true,
        read: async () => '',
        write: async () => assert.fail('Opening the game cannot write a save'),
      }, async () => {});
      console.log('PASS: youtube defers engine and archive requests during a startup pause');
    }

    for (const failure of ['rejected', 'malformed', ...(target === 'playgama' ? ['unavailable'] : [])]) {
      let attempts = 0;
      await open(browser, url, target, {
        cloud: failure !== 'unavailable',
        read: async () => {
          if (failure === 'malformed') return target === 'youtube' ? '{broken' : [];
          throw new Error('Cloud load rejected');
        },
        write: async () => { attempts++; },
      }, async (page, warnings) => {
        const before = await snapshot(page);
        await start(page);
        await extract(page);
        assert.ok(!(await snapshot(page)).equals(before), 'A failed load leaves the current session playable');
        assert.ok(warnings.some(value => value.includes('Could not restore the saved makeover')),
          `The ${failure} cloud read reaches the game as an error`);
        assert.equal(attempts, 0, 'An unknown cloud record cannot be overwritten');
      });
    }
    console.log(`PASS: ${target} protects the cloud record on failed reads`);

    let stored = cloud(target, { existing: 'unrelated record' });
    let reads = 0;
    let writes = 0;
    let finishCloudRead;
    const pendingCloudRead = new Promise(resolve => { finishCloudRead = resolve; });
    await open(browser, url, target, {
      read: async () => {
        reads++;
        if (reads === 2) await pendingCloudRead;
        return stored;
      },
      write: async value => {
        writes++;
        if (writes === 1) throw new Error('Cloud write rejected');
        stored = value;
      },
    }, async (page, warnings) => {
      const before = await snapshot(page);
      await start(page);
      await extract(page);
      const extracted = await snapshot(page);
      await until(() => reads >= 2, 'The milestone reaches the cloud write boundary');
      await page.evaluate(() => {
        if (window.hostPause) window.hostPause(true);
        else window.dispatchEvent(new Event('blur'));
      });
      finishCloudRead();
      await until(() => warnings.some(value => value.includes('Could not save the makeover')),
        'The suspended write is deferred for retry');
      assert.equal(writes, 0, 'A pending cloud read cannot launch a write during pause');
      await page.evaluate(() => {
        if (window.hostPause) window.hostPause(false);
        else window.dispatchEvent(new Event('focus'));
      });
      await until(() => writes === 2, 'The game retries the rejected cloud write');
      assert.ok(!extracted.equals(before), 'The milestone remains visible through a failed write');
      assert.ok(warnings.some(value => value.includes('Could not save the makeover')), 'The rejected cloud write reaches the game');
      assert.deepEqual(typeof stored === 'string' ? JSON.parse(stored) : stored,
        { existing: 'unrelated record', [key]: savedRun(1) });
      await page.reload();
      await page.waitForFunction(() => window.hostEvents?.some(event => event.type === 'ready'));
      await enterLevel(page);
      assert.ok((await snapshot(page)).equals(extracted), 'Reload restores extraction from the cloud');
    });
    console.log(`PASS: ${target} retries a failed write and reloads the saved treatment`);
    return evidence;
  });
}

async function main() {
  const [bundle] = process.argv.slice(2);
  assert.ok(bundle, 'Pass the unpacked auto-detect distribution package');
  const browser = await launchChrome();
  try {
    const evidence = { browser: `Chrome ${browser.version()}`, host: process.platform + ' ' + process.arch };
    for (const target of ['youtube','playgama']) {
      evidence[target] = await verify(browser, target, bundle);
    }
    if (process.env.PACKAGE_EVIDENCE_FILE) {
      fs.writeFileSync(process.env.PACKAGE_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + '\n');
    }
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
}

function launchChrome() {
  return chromium.launch({
    executablePath: chrome,
    args: ['--host-resolver-rules=MAP runway.test 127.0.0.1', '--no-proxy-server'],
  });
}

module.exports = { cloud, key, launchChrome, open, savedRun, until, withPackage };

if (require.main === module) main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
