const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { setTimeout: wait } = require('node:timers/promises');
const { preview } = require('../scripts/serve.cjs');
const { tapStage } = require('./entry.cjs');
(async () => {
  const server = preview(process.argv[2] || 'game/dist/html5/Runway Rewind');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 960 } });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => localStorage.setItem('runway-rewind.level-2', JSON.stringify({ version: 1, level: 'level-2', completedTreatments: 4, completed: false })));
    await page.reload();
    await page.locator('#game-loading').waitFor({ state: 'detached' });
    await wait(150); await tapStage(page, 320, 480);
    await wait(150); await tapStage(page, 440, 480); await wait(600);
    async function handPixels() {
      const image = PNG.sync.read(await page.screenshot({ clip: { x: 65, y: 365, width: 75, height: 85 } }));
      let count = 0;
      for (let i = 0; i < image.data.length; i += 4) {
        if (image.data[i] > 220 && image.data[i + 1] > 220 && image.data[i + 2] > 220) count++;
      }
      return count;
    }
    const initial = await handPixels();
    await tapStage(page, 10, 900); await wait(3000);
    const early = await handPixels(); await wait(2400);
    const late = await handPixels();
    assert.ok(initial > 300, 'Hint appears at start');
    assert.ok(early < 30, 'No hint at three seconds');
    assert.ok(late > 300, 'Hint returns after five idle seconds');
    console.log('PASS: initial tutorial and five-second idle cooldown');
  } finally {
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
