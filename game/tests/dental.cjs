const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const {setTimeout:wait}=require('node:timers/promises');
const {preview}=require('../scripts/serve.cjs');
const {enterLevel,tapStage}=require('./entry.cjs');
const teeth=[[80,381],[128,380],[193,388],[275,390],[378,390],[459,384],[521,377],[563,380],[93,482],[156,507],[225,521],[293,526],[359,526],[424,520],[484,506],[539,480]];
const gaps=[[101,396],[158,405],[223,422],[326,430],[426,417],[491,400],[548,395],[126,504],[193,532],[259,544],[326,548],[392,540],[457,528],[516,505]];
const paste=[[135,392],[278,402],[410,400],[506,390],[178,520],[310,533],[442,520]];
const items=[[155,394],[80,400],[326,412],[395,365],[565,400],[100,500],[175,530],[425,530],[550,515],[487,407],[260,537]];
const point=([x,y])=>[-70.4+x*1.22,-97.9+y*1.22];
const key='runway-rewind.level-2';
async function boundary(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key))?.completedTreatments??0,key)}
async function enamel(page){const im=PNG.sync.read(await page.locator('canvas').screenshot());const [x,y]=point([275,350]).map(Math.round);return [...im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+3)]}
(async()=>{
 const server=preview(process.argv[2]||path.join(__dirname,'../../.scratch/html5/Runway Rewind'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:640,height:960},hasTouch:true});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/ERROR:/.test(m.text()))errors.push(m.text())});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await enterLevel(page,2);
  let yellow;
  for(let stage=1;stage<=8;stage++){
   if(process.env.STAGE_EVIDENCE_DIR){fs.mkdirSync(process.env.STAGE_EVIDENCE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.STAGE_EVIDENCE_DIR,`dental-${stage}.png`)})}
   if(stage===4)yellow=await enamel(page);
   if(stage===5)assert.deepEqual(await enamel(page),yellow,'Floss removes debris without whitening enamel');
   if(stage===8)assert.notDeepEqual(await enamel(page),yellow,'Brushing cleans enamel before polish');
   if(stage===1){
    // An invalid drop returns the item and cannot complete the collection.
    await page.mouse.move(...point(items[0]));await page.mouse.down();await wait(320);await page.mouse.move(...point([155,280]));await wait(80);await page.mouse.up();
    for(const [i,p] of items.entries()){
     if(i===0){
      const cdp=await page.context().newCDPSession(page);const [x,y]=point(p);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await wait(340);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-135}]});await wait(80);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:245,y:660}]});await wait(80);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(80);
      await tapStage(page,570,910);await wait(80);await tapStage(page,220,550);await wait(80);continue;
     }
     await page.mouse.move(...point(p));await page.mouse.down();await wait(320);await page.mouse.move(...point([p[0],p[1]-105]),{steps:5});await wait(80);await page.mouse.move(245,660,{steps:10});await wait(70);await page.mouse.up();await wait(30)}
   }else{
    const points=stage===3||stage===4?gaps:stage===5?paste:teeth;
    let treated=0;
    for(const p of points){if(await boundary(page)>=stage)break;treated++;await page.mouse.move(...point(p));await page.mouse.down();
     if([3,5,7,8].includes(stage))await wait(640);
     else for(let k=0;k<9;k++){await page.mouse.move(...point([p[0]+(k%2?-25:25),p[1]]));await wait(40)}
     await page.mouse.up();await wait(950);
    }
    if(stage===5)assert.ok(treated<points.length,'Paste completes before every application spot is filled');
   }
   await wait(1300);assert.equal(await boundary(page),stage,`Treatment ${stage} completes and checkpoints`);console.log(`PASS: dental treatment ${stage}`);
   if(stage<8){await page.mouse.move(535,800);await page.mouse.down();await wait(50);const before=await page.locator('canvas').screenshot();await page.mouse.up();await page.reload();await enterLevel(page,2);await page.mouse.move(535,800);await page.mouse.down();await wait(50);const after=await page.locator('canvas').screenshot();await page.mouse.up();const a=PNG.sync.read(before),b=PNG.sync.read(after);for(let y=290;y<600;y++)for(let x=20;x<620;x++){const i=(y*640+x)*4;assert.equal(a.data.readUInt32LE(i),b.data.readUInt32LE(i),`Boundary ${stage} reconstructs mouth at ${x},${y}`)}}
  }
  await wait(600); await tapStage(page,320,888);await wait(100);await tapStage(page,440,480);await wait(800);
  assert.equal(await boundary(page),0,'Selecting a completed level starts a fresh replay');
  await tapStage(page,570,910);await wait(80);await tapStage(page,220,550);await wait(80);
  assert.equal(await boundary(page),0,'Cancel exit preserves current run');
  assert.deepEqual(errors,[]);console.log('PASS: replay and cancel exit');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
