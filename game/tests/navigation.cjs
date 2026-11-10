const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { preview } = require('../scripts/serve.cjs');
const { setTimeout: wait } = require('node:timers/promises');
const { mockBridgeStorage, deferred, waitFor } = require('./persistence.cjs');

function pixel(png, x, y) { return [...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)]; }
async function frame(page) { return PNG.sync.read(await page.locator('canvas').screenshot()); }
async function home(page) {
  const [r, g, b] = pixel(await frame(page), 50, 480);
  assert(r > 170 && g > 150 && b > 190, 'Home has a pastel backdrop, not an active portrait');
}
(async () => {
  const server = preview(process.argv[2] || path.join(__dirname, '../../.scratch/html5/Runway Rewind'));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 960 }, hasTouch: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (/ERROR:/.test(m.text())) errors.push(m.text()); });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#game-loading').waitFor({ state: 'detached', timeout: 30000 });
    await wait(500); await home(page);
    console.log('PASS: launch opens Home');
    const runs = await page.evaluate(async () => {
      const platform = window.runwayPlatform;
      platform.prepareRun(8, 'level-2');
      await new Promise(resolve => setTimeout(resolve, 100));
      platform.initialRun(); platform.saveRun(3, 'level-2');
      platform.prepareRun(13, 'level-1');
      await new Promise(resolve => setTimeout(resolve, 100));
      platform.initialRun(); platform.saveRun(1, 'level-1');
      await new Promise(resolve => setTimeout(resolve, 100));
      return ['level-1', 'level-2'].map(id => JSON.parse(localStorage.getItem('runway-rewind.' + id)));
    });
    assert.equal(runs[0]?.completedTreatments, 1, 'Level 1 owns its checkpoint');
    assert.equal(runs[1]?.completedTreatments, 3, 'Level 2 owns its checkpoint');
    console.log('PASS: independent level checkpoints');
    await page.mouse.click(320, 480, {delay:60}); await wait(200);
    await page.mouse.click(440, 480, {delay:60}); await wait(900);
    const [r, g, b] = pixel(await frame(page), 320, 350);
    assert(r > 150 && g > 100 && b < 150, 'Level 2 selection displays the dental portrait');
    await page.mouse.click(570, 910, {delay:60}); await wait(100);
    await page.mouse.click(420, 550, {delay:60}); await wait(150);
    await home(page);
    console.log('PASS: selection enters dental level and confirmed exit returns to selection');
    assert.deepEqual(errors, []);
    const delayed = await browser.newPage({viewport:{width:640,height:960}});
    const gate=deferred(), writing=deferred(); const records=new Map();
    await mockBridgeStorage(delayed, async key=>records.get(key)??null, async(value,key)=>{
      if(JSON.parse(value).completedTreatments===4){writing.resolve();await gate.promise}
      records.set(key,value);
    });
    await delayed.goto(`http://127.0.0.1:${server.address().port}`);
    await delayed.locator('#game-loading').waitFor({state:'detached'});
    await delayed.evaluate(async()=>{
      const p=window.runwayPlatform; p.prepareRun(13,'level-1');await new Promise(r=>setTimeout(r,80));p.initialRun();p.saveRun(4,'level-1');
    });
    await waitFor(writing,'Delayed save starts');
    await delayed.evaluate(async()=>{
      const p=window.runwayPlatform;p.prepareRun(8,'level-2');await new Promise(r=>setTimeout(r,80));p.initialRun();p.saveRun(3,'level-2');p.saveRun(0,'level-1');
      p.prepareRun(13,'level-1');
    });
    assert.equal(await delayed.evaluate(()=>window.runwayPlatform.initialRun().boundary),0,'Pending Replay wins on re-entry');
    gate.resolve();await wait(150);
    assert.equal(JSON.parse(records.get('runway-rewind.level-1')).completedTreatments,0,'Replay wins over an in-flight save');
    assert.equal(JSON.parse(records.get('runway-rewind.level-2')).completedTreatments,3,'Delayed writes cannot cross levels');
    await delayed.close();console.log('PASS: delayed cross-level saves and Replay ordering');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
