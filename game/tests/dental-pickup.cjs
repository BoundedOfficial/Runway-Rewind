const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {PNG}=require('pngjs');
const {setTimeout:wait}=require('node:timers/promises');
const {preview}=require('../scripts/serve.cjs');
const {enterLevel}=require('./entry.cjs');
const worms=[[155,394],[326,412],[487,407],[260,537],[80,396],[565,400],[130,500],[425,530]];
const point=([x,y])=>[-70.4+x*1.22,-97.9+y*1.22];
(async()=>{
 const server=preview(process.argv[2]||'.scratch/html5/Runway Rewind');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:640,height:960},hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(/ERROR:/.test(m.text()))errors.push(m.text())});
  await p.goto(`http://127.0.0.1:${server.address().port}`);await enterLevel(p,2);
  const cdp=await p.context().newCDPSession(p);
  // Hold a worm by its tail away from the other animated worms and tool tip.
  const clip={x:270,y:590,width:55,height:90};
  const pixels=async()=>PNG.sync.read(await p.screenshot({clip})).data;
  const background=await pixels();
  await p.mouse.move(...point([155,449]));await p.mouse.down();await wait(30);
  await p.mouse.move(...point([300,650]));await wait(200);
  const held=await pixels();await wait(300);const heldLater=await pixels();
  function changed(a,b){let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>6)n++;return n;}
  console.log({liftedPixels:changed(held,background),heldChangedPixels:changed(heldLater,held)});
  assert.ok(changed(held,background)>200,'The captured region contains the lifted worm');
  assert.equal(changed(heldLater,held),0,'The held body stays stable at the captured point instead of jittering between animation frames');
  await p.mouse.up();await wait(200); // Invalid drop returns it for a later pickup.

  for(const [i,[x,y]] of worms.entries()){
   // Grab different parts of each body and immediately leave its hit area.
   const [sx,sy]=point([x,y+[5,30,55][i%3]]);
   if(i%2){
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});await wait(30);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:245,y:900}]});
    await wait(120);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }else{
    await p.mouse.move(sx,sy);await p.mouse.down();await wait(30);await p.mouse.move(245,900);await wait(120);await p.mouse.up();
   }
   await wait(100);
  }
  await wait(1300);
  const completed=await p.evaluate(()=>JSON.parse(localStorage.getItem('runway-rewind.level-2'))?.completedTreatments??0);
  console.log({completed});assert.equal(completed,1,'Quick mouse/touch drags must latch the pressed worm across its full body and collect it');assert.deepEqual(errors,[]);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
