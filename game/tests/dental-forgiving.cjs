const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const {setTimeout:wait}=require('node:timers/promises');
const {preview}=require('../scripts/serve.cjs');
const {enterLevel}=require('./entry.cjs');
const key='runway-rewind.level-2';
const point=([x,y])=>[-70.4+x*1.22,-97.9+y*1.22];
const paste=[[135,332],[278,342],[410,340],[506,330],[178,580],[310,593],[442,580]];
(async()=>{
 const server=preview(process.argv[2]||'game/dist/html5/Runway Rewind');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:640,height:960}});const url=`http://127.0.0.1:${server.address().port}`;
  async function seed(n){await page.goto(url);await page.evaluate(({key,n})=>localStorage.setItem(key,JSON.stringify({version:1,level:'level-2',completedTreatments:n,completed:false})),{key,n});await page.reload();await enterLevel(page,2);}
  async function boundary(){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)).completedTreatments,key);}
  async function hold(p,ms){await page.mouse.move(...point(p));await page.mouse.down();await wait(ms);await page.mouse.up();}
  await seed(4);
  for(const p of paste.slice(0,6))await hold(p,950);
  await wait(1000);assert.equal(await boundary(),4,'Six of seven paste spots is not enough');
  await hold(paste[6],350);await wait(1000);assert.equal(await boundary(),4,'A little final coverage still requires more application');
  await hold(paste[6],250);await wait(1300);assert.equal(await boundary(),5,'95% paste coverage completes without fully covering the last spot');
  console.log('PASS: toothpaste expanded reach, sustained work, and forgiving final coverage');
  await seed(7);const clean=PNG.sync.read(await page.locator('canvas').screenshot());
  const teeth=[[80,381],[128,380],[193,388],[275,390],[378,390],[459,384],[521,377],[563,380],[93,482],[156,507],[225,521],[293,526],[359,526],[424,520],[484,506],[539,480]];
  for(const [x,y] of teeth){if(await boundary()===8)break;await hold([x,y+(y<440?-60:60)],1000);}
  await wait(1300);assert.equal(await boundary(),8,'Polish works at the expanded outer edge');
  const polished=PNG.sync.read(await page.locator('canvas').screenshot());
  let lift=0,count=0;
  for(const p of [[275,350],[378,350],[225,510],[359,510]]){const [x,y]=point(p).map(Math.round),i=(y*640+x)*4;lift+=polished.data[i+2]-clean.data[i+2];count++;}
  console.log({meanBlueLift:lift/count});assert.ok(lift/count>25,'Polish visibly lifts enamel to a brighter, cooler white');
  fs.mkdirSync('game/dist/test-results/tuning',{recursive:true});fs.writeFileSync('game/dist/test-results/tuning/clean.png',PNG.sync.write(clean));fs.writeFileSync('game/dist/test-results/tuning/polished.png',PNG.sync.write(polished));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
