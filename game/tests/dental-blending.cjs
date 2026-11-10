const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {setTimeout:wait}=require('node:timers/promises');
const {preview}=require('../scripts/serve.cjs');
const {enterLevel}=require('./entry.cjs');
const teeth=[[80,381],[128,380],[193,388],[275,390],[378,390],[459,384],[521,377],[563,380],[93,482],[156,507],[225,521],[293,526],[359,526],[424,520],[484,506],[539,480]];
const gaps=[[101,396],[158,405],[223,422],[326,430],[426,417],[491,400],[548,395],[126,504],[193,532],[259,544],[326,548],[392,540],[457,528],[516,505]];
const paste=[[135,392],[278,402],[410,400],[506,390],[178,520],[310,533],[442,520]];
const items=[[155,394],[326,412],[487,407],[260,537],[80,396],[565,400],[130,500],[425,530]];
const point=([x,y])=>[-70.4+x*1.22,-97.9+y*1.22];
(async()=>{
 const server=preview(process.argv[2]||'game/dist/html5/Runway Rewind');await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const b=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const p=await b.newPage({viewport:{width:640,height:960}});const errors=[];p.on('console',m=>{if(/ERROR:/.test(m.text()))errors.push(m.text())});p.on('pageerror',e=>errors.push(e.message));
  // Observe rendered frames and public checkpoint writes; no gameplay test API.
  await p.addInitScript(()=>{
   const raf=window.requestAnimationFrame.bind(window),set=Storage.prototype.setItem;
   let previous,pending;
   window.blendResults=[];window.blendWatch=false;
   Storage.prototype.setItem=function(key,value){
    if(window.blendWatch&&key==='runway-rewind.level-2')pending=JSON.parse(value).completedTreatments;
    return set.call(this,key,value);
   };
   const buffer=document.createElement('canvas');buffer.width=610;buffer.height=340;
   const context=buffer.getContext('2d',{willReadFrequently:true});
   window.requestAnimationFrame=callback=>raf(time=>{
    callback(time);
    if(!window.blendWatch){previous=null;return;}
    const canvas=document.querySelector('canvas');if(!canvas)return;
    context.drawImage(canvas,15,270,610,340,0,0,610,340);
    const current=context.getImageData(0,0,610,340).data;
    if(pending&&previous){
     let changed=0,total=0;for(let i=0;i<current.length;i+=4){const d=Math.abs(current[i]-previous[i])+Math.abs(current[i+1]-previous[i+1])+Math.abs(current[i+2]-previous[i+2]);if(d>6)changed++;total+=d;}
     window.blendResults.push({boundary:pending,changedPixels:changed,meanChannelDifference:total/(610*340*3),opaquePixels:current.filter((v,i)=>i%4===3&&v===255).length});pending=null;
    }
    previous=current;
   });
  });
  const url=`http://127.0.0.1:${server.address().port}`;
  for(const [boundary,name,points,stroke] of [[0,'collection',items,'collect'],[1,'scraping',teeth,true],[2,'drill',gaps,false],[3,'floss',gaps,true],[4,'paste',paste,false],[5,'brush',teeth,true],[6,'suction',teeth,false],[7,'polish',teeth,false]]){
   if(process.argv[3]&&name!==process.argv[3])continue;
   await p.goto(url);await p.evaluate(n=>localStorage.setItem('runway-rewind.level-2',JSON.stringify({version:1,level:'level-2',completedTreatments:n,completed:false})),boundary);
   await p.reload();await enterLevel(p,2);await p.evaluate(()=>window.blendWatch=true);
   if(stroke==='collect'&&process.env.STAGE_EVIDENCE_DIR){fs.mkdirSync(process.env.STAGE_EVIDENCE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.STAGE_EVIDENCE_DIR,'worms-start.png')});}
   for(const q of points){
    if(stroke==='collect'&&q===points.at(-1)){
     assert.equal(await p.evaluate(()=>window.blendResults.length),0,'Every worm must be collected before leaving the opening stage');
     if(process.env.STAGE_EVIDENCE_DIR)await p.screenshot({path:path.join(process.env.STAGE_EVIDENCE_DIR,'worms-dish.png')});
    }
    if(await p.evaluate(()=>window.blendResults.length))break;
    await p.mouse.move(...point(q));await p.mouse.down();
    if(stroke==='collect'){await wait(650);await p.mouse.move(...point([q[0],q[1]-110]),{steps:5});await p.mouse.move(245,900,{steps:8});await wait(80);}
    else if(stroke){for(let k=0;k<6;k++)await p.mouse.move(...point([q[0]+(k%2?-25:25),q[1]]));await wait(1200);}else await wait(1400);
    await p.mouse.up();if(stroke==='collect')await wait(100);
   }
   await wait(1400);const result=await p.evaluate(()=>window.blendResults[0]);
   console.log(name,result);assert.ok(result,`${name} reaches its checkpoint`);assert.equal(result.boundary,boundary+1);
   assert.ok(result.opaquePixels>200000,'Frame comparison contains the actual rendered mouth');
   assert.ok(result.changedPixels<100,`${name}: completed layers match the following stage without a visual jump`);
   if(process.env.STAGE_EVIDENCE_DIR){fs.mkdirSync(process.env.STAGE_EVIDENCE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.STAGE_EVIDENCE_DIR,`after-${name}.png`)});}
  }
  assert.deepEqual(errors,[]);
 }finally{await b.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
