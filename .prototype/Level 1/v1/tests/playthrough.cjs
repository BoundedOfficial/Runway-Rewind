require('node:fs').mkdirSync(require('node:path').join(__dirname,'../test-results'),{recursive:true});
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/layers/manifest.json'),'utf8'));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>window.roseAtelier?.getState().coverage.length);
 const state=()=>page.evaluate(()=>roseAtelier.getState());
 const geometry=async()=>({box:await page.locator('#scene').boundingBox(),view:(await state()).view});
 const position=(x,y,{box:b,view:v})=>({x:b.x+((x-v.x)*v.scale+320)/640*b.width,y:b.y+((y-v.y)*v.scale+480)/960*b.height});
 const tap=async(x,y)=>{const p=position(x,y,await geometry());await page.mouse.click(p.x,p.y)};
 const sweep=async(x1=110,x2=530,y1=120,y2=800)=>{const g=await geometry(),move=async(x,y)=>{const p=position(x,y,g);await page.mouse.move(p.x,p.y)};await move(x1,y1);await page.mouse.down();for(let y=y1;y<=y2;y+=26){await move(x1,y);await move(x2,y);}await page.mouse.up();};
 const first=manifest.find(s=>s.id==='extract-0').anchor;
 await tap(...first);assert.equal((await state()).coverage[0].done,false,'Requires a selected tool');
 await page.click('#tool');await tap(20,30);assert.equal((await state()).coverage.every(g=>g.fraction===0),true,'Off-target tap does not count');
 await tap(...first);assert.equal((await state()).coverage[0].done,true);assert.equal((await state()).complete,false,'One pimple must not complete all fourteen');
 for(const s of manifest.filter(s=>s.id.startsWith('extract-')))await tap(...s.anchor);
 await page.waitForFunction(()=>roseAtelier.getState().complete);
 assert.equal((await state()).complete,true);await page.screenshot({path:'test-results/geisha-extracted.png',fullPage:true});
 const observed=[2];
 for(let stage=1;stage<13;stage++){
  await page.click('#next');await page.waitForFunction(()=>!roseAtelier.getState().transitioning);await page.waitForTimeout(650);assert.equal((await state()).stage,stage);const source=(await state()).sourceIndex;observed.push(source);
  if(source===5)await page.locator('#scene').screenshot({path:'test-results/regression-clean-untouched.png'});
  if(source===null)await page.waitForTimeout(1000);
  if(source==='robe'||source===null)await page.locator('#scene').screenshot({path:source==='robe'?'test-results/robe-before.png':'test-results/style-before.png'});
  await page.click('#tool');
  if(source===6){
   await page.locator('#scene').screenshot({path:'test-results/razor-before.png'});
   await sweep(188,306,305,340);await page.mouse.move(0,0);await page.waitForTimeout(1200);
   const partial=await state();
   assert.equal(partial.coverage[0].done,true,'Left brow shaves independently');
   assert.equal(partial.coverage[1].done,false,'Right brow still needs shaving');
   await page.locator('#scene').screenshot({path:'test-results/razor-half.png'});
   await sweep(334,452,305,340);await page.mouse.move(0,0);await page.waitForFunction(()=>roseAtelier.getState().complete);await page.waitForTimeout(1200);
   await page.locator('#scene').screenshot({path:'test-results/razor-after.png'});
  }
  if(source===4){await sweep(160,280,360,600);assert.equal((await state()).complete,false,'Every cream region required');}
  if(source===5){await sweep(160,285,140,670);assert.equal((await state()).complete,false);await page.screenshot({path:'test-results/geisha-half-clean.png',fullPage:true});}
  if(source==='robe')await sweep(5,635,640,955);else if(source===null)await sweep(75,565,145,510);else await sweep();
  await page.waitForFunction(()=>roseAtelier.getState().complete);
  assert.equal((await state()).complete,true,`Treatment ${stage+1} did not complete: ${JSON.stringify(await state())}`);
  if(source===4||source===5){await page.waitForTimeout(1100);await page.locator('#scene').screenshot({path:source===4?'test-results/regression-before-clean.png':'test-results/regression-after-clean.png'});}
  if(source===8){await page.mouse.move(0,0);await page.waitForTimeout(1200);await page.locator('#scene').screenshot({path:'test-results/regression-hydrated.png'});}
  if([9,24,null].includes(source)){await page.mouse.move(0,0);await page.waitForTimeout(1200);await page.locator('#scene').screenshot({path:`test-results/hair-boundary-${source===9?7:source===24?19:20}.png`});}
  if(source==='robe'){await page.mouse.move(0,0);await page.waitForTimeout(1200);await page.locator('#scene').screenshot({path:'test-results/robe-after.png'});}
  const captures={4:'cream',5:'cleaned',7:'scrub',8:'hydrated',12:'brows',20:'eyes',24:'lips',null:'styled'};
  if(captures[source])await page.screenshot({path:`test-results/geisha-${captures[source]}.png`,fullPage:true});
  console.log(`Passed treatment ${stage+1}/13`);
 }
 assert.deepEqual(observed,[2,4,5,'robe',6,7,8,9,12,20,23,24,null]);
 await page.click('#next');assert.equal((await state()).finished,true);await page.waitForTimeout(750);await page.screenshot({path:'test-results/geisha-complete.png',fullPage:true});
 await page.locator('#compare').fill('50');await page.screenshot({path:'test-results/geisha-compare.png',fullPage:true});
 await page.click('#replay');assert.equal((await state()).stage,0);assert.equal((await state()).coverage.every(g=>g.fraction===0),true);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'test-results/geisha-mobile.png',fullPage:true});
 await page.click('#tool');await page.locator('#scene').scrollIntoViewIfNeeded();const cdp=await page.context().newCDPSession(page),touch=position(...first,await geometry());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await state()).coverage[0].done,true,'Touch must hit the same sprite');
 await page.click('#restart');assert.equal((await state()).selected,false);assert.equal((await state()).coverage.every(g=>g.fraction===0),true);
 assert.equal(requests.some(u=>u.includes('/exports/')||u.includes('/analysis/')),false);assert.equal((await state()).assetCount,38);assert.deepEqual(errors,[]);
 console.log('PASS: 14 individual extractions, 13 treatments, 38 raster sprites, partial wipes, independent regions, transitions, compare, replay, real touch, mobile, original asset isolation, no JS errors.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
