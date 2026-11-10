const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {setTimeout:wait}=require('node:timers/promises');
const {preview}=require('../scripts/serve.cjs');
const {enterLevel}=require('./entry.cjs');
(async()=>{
 const server=preview(process.argv[2]||'game/dist/html5/Runway Rewind');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:640,height:960}});
 await page.addInitScript(()=>{
  const raf=window.requestAnimationFrame.bind(window),buffer=document.createElement('canvas');buffer.width=640;buffer.height=960;
  const ctx=buffer.getContext('2d',{willReadFrequently:true});window.motion=[];
  window.requestAnimationFrame=fn=>raf(t=>{fn(t);if(!window.watchMotion)return;const canvas=document.querySelector('canvas');if(!canvas)return;ctx.drawImage(canvas,0,0);const data=ctx.getImageData(100,550,350,330).data;let count=0;for(let i=0;i<data.length;i+=4)if(data[i+1]>data[i]*1.2&&data[i+2]>data[i]*1.1&&data[i+1]>100)count++;window.motion.push(count);});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.evaluate(()=>localStorage.setItem('runway-rewind.level-2',JSON.stringify({version:1,level:'level-2',completedTreatments:4,completed:false})));
 await page.reload();await enterLevel(page,2);
 await page.mouse.move(200,650);await page.mouse.down();await wait(300);
 await page.evaluate(()=>{window.motion=[];window.watchMotion=true});await wait(100);
 const before=await page.evaluate(()=>window.motion.at(-1));
 await page.evaluate(()=>window.motion=[]);await page.mouse.up();await wait(100);
 const after=await page.evaluate(()=>window.motion);
 console.log({before,after});assert.ok(before>500,'Actual toothpaste tool is visible');
 assert.ok(after[0]>before*.5,'Releasing the tool must start a continuous return, not teleport to the tray');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
