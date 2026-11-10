const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const { PNG } = require('pngjs');
const { setTimeout: wait } = require('node:timers/promises');
const { preview } = require('../scripts/serve.cjs');
const { enterLevel } = require('./entry.cjs');
const key = 'runway-rewind.level-2';
const gaps = [[101,396],[158,405],[223,422],[326,430],[426,417],[491,400],[548,395],[126,504],[193,532],[259,544],[326,548],[392,540],[457,528],[516,505]];
const point = ([x,y]) => [-70.4+x*1.22,-97.9+y*1.22];
const last = gaps.at(-1);
const [cx,cy] = point(last);
const clip = {x:Math.floor(cx-15),y:Math.floor(cy-31),width:30,height:62};
async function frame(page) { return PNG.sync.read(await page.screenshot({clip})).data; }
function difference(a,b) { return a.reduce((sum,value,i)=>sum+Math.abs(value-b[i]),0); }
async function boundary(page) { return page.evaluate(key=>JSON.parse(localStorage.getItem(key)).completedTreatments,key); }
async function seed(page,url,n) {
  await page.goto(url);
  await page.evaluate(({key,n})=>localStorage.setItem(key,JSON.stringify({version:1,level:'level-2',completedTreatments:n,completed:false})),{key,n});
  await page.reload(); await enterLevel(page,2);
}
async function work(page,p,stroke,partial=false) {
  await page.mouse.move(...point(p)); await page.mouse.down();
  if (stroke) {
    const deadline=Date.now()+470;
    for(let i=0;i<26 && (!partial || Date.now()<deadline);i++) {
      await page.mouse.move(...point([p[0]+(i%2?-25:25),p[1]])); await wait(40);
    }
  } else await wait(partial?680:1050);
  await page.mouse.up();
  await page.mouse.move(535,800); await wait(60);
}
(async()=>{
  const server=preview(process.argv[2]||'game/dist/html5/Runway Rewind');
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:640,height:960}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(/ERROR:/.test(m.text()))errors.push(m.text())});
    const url=`http://127.0.0.1:${server.address().port}/`;
    for(const [n,name] of [[2,'drill'],[3,'floss']]) {
      await seed(page,url,n+1); const clean=await frame(page);
      await seed(page,url,n); const untouched=await frame(page);
      // One quick contact is not enough, even though the hit area is forgiving.
      await page.mouse.move(...point(gaps[0]));await page.mouse.down();
      await page.mouse.move(...point(gaps.at(-1)),{steps:2});await page.mouse.up();
      assert.equal(await boundary(page),n,`${name}: a fast sweep cannot complete the stage`);
      for(const p of gaps.slice(0,-1)) await work(page,p,n===3);
      await wait(1100);
      assert.equal(await boundary(page),n,`${name}: clearing 13/14 targets cannot skip the remaining one`);
      await work(page,last,n===3,true);
      await wait(1100);
      await page.mouse.click(10,900,{delay:40});await wait(50);
      const partial=await frame(page);
      assert.equal(await boundary(page),n,`${name}: a partial final target still needs work`);
      assert.ok(difference(partial,clean)>difference(untouched,clean)*.25,
        `${name}: unfinished debris stays clearly visible against the clean plate`);
      await work(page,last,n===3);await wait(1100);
      assert.equal(await boundary(page),n+1,`${name}: finishing the final target advances`);
      console.log(`PASS: ${name} requires every target, sustained work, and visible remaining debris`);
    }
    assert.deepEqual(errors,[]);
  } finally { await browser.close();server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
