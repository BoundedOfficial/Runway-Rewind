/* Throwaway gameplay prototype: does a eight-treatment gross-to-clean dental sequence feel satisfying? */
const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s),W=640,H=960;
const load=src=>new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
const steps=[
 ['Clear the leftovers','Food or worms: pull, then drop.','TWEEZERS',0,'pull'],
 ['Crack the crust','Scrape across the rough yellow buildup.','DENTAL SCALER',1,'scrape'],
 ['Clean the tight spots','Hold the rotating tip over the dark gaps.','DENTAL HANDPIECE',2,'hold'],
 ['Floss the gaps','Pull trapped fibers from the gaps.','FLOSS PICK',3,'floss'],
 ['A little mint magic','Apply paste across both rows.','TOOTHPASTE',4,'paste'],
 ['Brush it all away','Brush yellow stains off each tooth.','TOOTHBRUSH',5,'brush'],
 ['Clear the foam','Hold the tip over the foam.','SUCTION',7,'suction'],
 ['Make it shine','Buff each tooth with the little polishing cup.','POLISHER',8,'polish']
];
// Coordinates use the registered 640×960 plates before the gameplay camera zoom.
const teeth=[[80,381],[128,380],[193,388],[275,390],[378,390],[459,384],[521,377],[563,380],[93,482],[156,507],[225,521],[293,526],[359,526],[424,520],[484,506],[539,480]];
const gaps=[[101,396],[158,405],[223,422],[326,430],[426,417],[491,400],[548,395],[126,504],[193,532],[259,544],[326,548],[392,540],[457,528],[516,505]];
const pastePoints=[[135,392],[278,402],[410,400],[506,390],[178,520],[310,533],[442,520]];
const foodSeed=[[80,400,'leaf'],[225,365,'corn'],[395,365,'meat'],[565,400,'seed'],[100,500,'leaf'],[175,530,'meat'],[350,545,'corn'],[425,530,'leaf'],[550,515,'seed']];
const wormSeed=[[155,394],[326,412],[487,407],[260,537]];
let stage=-1,work=[],items=[],foam=[],particles=[],grip=null,pulling=false,pointer={x:520,y:785,down:false},previous=null,transition=0,clock=0,compare=false,sound=false,audio,toolArrival=0,started=false;
let clean,dirty,tools,worms,food,descaled,polished,fx,petri,dirtyLayer,dc,toolFrames=[],foodFrames=[],fxFrames=[],collected=[];
const dish={x:20,y:590,w:450,h:140};
const camera={x:-70.4,y:-97.9,scale:1.22};
const screen=p=>[camera.x+p[0]*camera.scale,camera.y+p[1]*camera.scale];
const portrait=p=>[(p.x-camera.x)/camera.scale,(p.y-camera.y)/camera.scale];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function tone(f=520,d=.06){if(!sound)return;audio??=new AudioContext;audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.55,audio.currentTime+d);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),1600)}
function resetDirt(plate=dirty){dirtyLayer=document.createElement('canvas');dirtyLayer.width=W;dirtyLayer.height=H;dc=dirtyLayer.getContext('2d');dc.drawImage(plate,0,0,W,H)}
function targets(){if(stage===2||stage===3)return gaps;if(stage===4)return pastePoints;return teeth}
function setStage(n){stage=n;transition=0;grip=null;pointer.down=false;previous=null;toolArrival=clock;
 if(n===8){$('#tray').hidden=true;$('#result').hidden=false;toast('Now that’s a transformation.');tone(880,.3);updateHUD();return}
 if(n===1)resetDirt(dirty);if(n===5)resetDirt(descaled);if(n===7)resetDirt(clean);
 work=targets().map(()=>0);if(n===0)items=makeDebris();
 if(n===6&&foam.length<20)for(const p of teeth)for(let i=0;i<4;i++)foam.push({x:p[0]+Math.sin(i*2)*17,y:p[1]+Math.cos(i*2)*15,r:8+i*2});
 updateHUD();}
function updateHUD(){const progress=stage<0?0:stage<1?items.filter(i=>i.done).length/items.length:work.reduce((a,b)=>a+b,0)/work.length;
 $('#steps').innerHTML=steps.map((_,i)=>`<i class="${i<stage?'done':i===stage?'active':''}"></i>`).join('');
 if(stage>=0&&stage<8){$('#stepNumber').textContent=`${String(stage+1).padStart(2,'0')} / ${steps.length}`;$('#title').textContent=steps[stage][0];$('#instruction').textContent=grip?(grip.freed?'Drop into the dish below ↓':'Pull to release…'):steps[stage][1];$('#toolLabel').textContent=steps[stage][2];$('#counter').textContent=stage<1?`${items.filter(i=>i.done).length} / ${items.length} collected`:`${Math.round(progress*100)}%`;$('#progress').style.width=`${progress*100}%`;$('#jump').value=stage;}
 $('#state').textContent=stage<0?'Ready to begin':stage===8?'All treatments complete':`Treatment ${stage+1}: ${steps[stage][4]} · ${Math.round(progress*100)}% · ${grip?'gripping':'ready'}`;
 return progress;}
function burst(x,y,color,n=7){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*100,vy:-40-Math.random()*90,life:.5+Math.random()*.4,r:5+Math.random()*6})}
function erase(x,y,r,alpha){dc.save();dc.globalCompositeOperation='destination-out';dc.globalAlpha=alpha;const g=dc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.65,'#000');g.addColorStop(1,'#0000');dc.fillStyle=g;dc.fillRect(x-r,y-r,r*2,r*2);dc.restore()}
function complete(){if(transition||stage<0||stage>=8)return;transition=clock+.9;pointer.down=false;grip=null;tone(720,.18);toast(['Food and worms cleared.','That crust had to go.','Fresh spaces.','Nothing left between them.','Ready to brush.','What a difference.','Foam cleared.','A smile worth showing.'][stage]);}
function update(dt){if(transition&&clock>transition){setStage(stage+1);return}if(!pointer.down||stage<0||stage>=8||transition)return;
 const p=portrait(pointer),speed=previous?distance(p,previous):0;
 if(stage<1){if(!grip){const item=items.find(i=>!i.done&&distance([i.x,i.y],p)<31);if(item){item.hold=(item.hold||0)+dt;if(item.hold>.24){grip=item;grip.start=p;grip.dx=grip.dy=0;tone(320);updateHUD()}}for(const item of items)if(!item.done&&distance([item.x,item.y],p)>=31)item.hold=0;}
 else {grip.dx=p[0]-grip.start[0];grip.dy=p[1]-grip.start[1];if(!grip.freed&&Math.hypot(grip.dx,grip.dy)>(grip.type==='worm'?88:65)){grip.freed=true;tone(420,.12);updateHUD();}}}
 else {const points=targets();for(let i=0;i<points.length;i++){if(work[i]>=1)continue;const target=points[i];const reach=stage===2?24:stage===3?30:stage===4?47:48;
 let hit=distance(p,target)<reach;if(previous&&speed>0){const dx=p[0]-previous[0],dy=p[1]-previous[1],t=clamp(((target[0]-previous[0])*dx+(target[1]-previous[1])*dy)/(speed*speed));hit ||= distance([previous[0]+dx*t,previous[1]+dy*t],target)<reach;}
 if(!hit)continue;const hold=[2,4,6,7].includes(stage);const amount=hold?dt/(stage===2?.55:stage===4?.4:stage===6?.4:.5):Math.min(speed,50)/(stage===5?165:stage===1?125:95);if(amount<=0)continue;
 work[i]=clamp(work[i]+amount);if([1,5,7].includes(stage))erase(target[0],target[1],82,.24);
 if(stage===5&&Math.random()<.6)foam.push({x:p[0]+(Math.random()-.5)*38,y:p[1]+(Math.random()-.5)*20,r:7+Math.random()*12});
 if(stage===6)foam=foam.filter(f=>distance([f.x,f.y],p)>65);
 if(work[i]>=1){const q=screen(target);burst(q[0],q[1],stage===1?'#9b712c':stage===7?'#ffffd7':'#bff8e4',stage===1?9:5);tone(stage===7?900:500,.04);if([1,5,7].includes(stage))erase(target[0],target[1],95,1);}}
 if(work.every(v=>v>=1)){if([1,5,7].includes(stage)){dc.clearRect(0,0,W,H)}if(stage===6)foam=[];complete();}}
 previous=p;updateHUD();}
function drawFood(item,t){
 if(item.done)return;let x=item.x,y=item.y;
 if(grip===item){x+=item.dx||0;y+=item.dy||0;}
 ctx.save();ctx.translate(x,y);ctx.shadowColor='#29150e70';ctx.shadowBlur=2;ctx.shadowOffsetY=1.5;
 if(item.type==='worm'){
  const frame=Math.floor(t*7+item.id*1.7)%6,sw=worms.width/3,sh=worms.height/2;
  const stretch=grip===item&&!item.freed?1+Math.min(.22,Math.hypot(item.dx||0,item.dy||0)/400):1;
  ctx.drawImage(worms,(frame%3)*sw,Math.floor(frame/3)*sh,sw,sh,-40,-13,80,80*stretch);
 }else{
  const index={leaf:0,corn:1,meat:2,seed:3}[item.type],im=foodFrames[index];
  const width=[36,27,43,33][index],height=width*im.height/im.width;
  ctx.rotate([-.3,.2,1.15,.95][index]+(item.id%3-1)*.14);
  ctx.drawImage(im,-width/2,-height/2,width,height);
 }
 ctx.restore();
}
function sprite(index,x,y,w,h,alpha=1){if(alpha<=0)return;ctx.save();ctx.globalAlpha=clamp(alpha);ctx.drawImage(fxFrames[index],x-w/2,y-h/2,w,h);ctx.restore()}
// One screen-space pass: dish first, then collected objects, then held object.
function drawDish(t){
 if(stage!==0||compare)return;
 ctx.drawImage(petri,dish.x,dish.y,dish.w,dish.h);
 ctx.save();ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillStyle='#17352e';
 ctx.fillText(grip?.freed?'DROP HERE ↓':'PETRI DISH',245,583);ctx.restore();
 for(const item of collected){const worm=item.type==='worm',index=collected.filter(i=>(i.type==='worm')===worm).indexOf(item);
 ctx.save();ctx.translate(worm?250+index*50:80+(index%3)*50,worm?620:635+Math.floor(index/3)*30);
 ctx.scale(camera.scale,camera.scale);drawFood({...item,x:0,y:0,done:false},t);ctx.restore();}
}
function makeDebris(){return foodSeed.map(([x,y,type],id)=>({x,y,type,id,done:false})).concat(wormSeed.map(([x,y],id)=>({x,y,type:'worm',id,done:false})))}
function drawTool(){const ctx=$("#toolCanvas").getContext("2d");ctx.clearRect(0,0,W,H);if(stage<0||stage>=8)return;const idx=steps[stage][3],im=toolFrames[idx];if(!im)return;const active=pointer.down&&!transition;const size=idx===6?150:230;const ratio=im.width/im.height;const width=Math.min(180,size*ratio);let x=active?pointer.x:535,y=active?pointer.y:709;const arrival=clamp((clock-toolArrival)/.45);if(!active)x+=(1-arrival)*240;
 ctx.save();ctx.translate(x,y);const angle=active?(stage===2?Math.sin(clock*90)*.025:stage===5?Math.sin(clock*24)*.10:Math.sin(clock*9)*.025):-.12;ctx.rotate(angle);ctx.shadowColor='#14352d55';ctx.shadowBlur=8;ctx.shadowOffsetY=7;const head=idx===6?.18:idx===3?.08:idx===5?.1:.035;ctx.drawImage(im,-width/2,-size*head,width,size);ctx.restore();}
function draw(t){
 ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);
 const plate=compare||stage<1?dirty:stage<5?descaled:stage<7?clean:polished;
 ctx.drawImage(plate,0,0,W,H);if(!compare&&[1,5,7].includes(stage))ctx.drawImage(dirtyLayer,0,0,W,H);
 // Deposits and fibers remain separate from the removable food and worms.
 if(!compare&&stage>=1&&stage<=3)gaps.forEach((p,i)=>{if(stage<=2)sprite(1,p[0],p[1],22,48,stage===2?1-work[i]:1);else sprite(2,p[0],p[1],28,48,1-work[i]);});

 if(!compare&&(stage===4||stage===5))pastePoints.forEach((p,i)=>{const nearest=teeth.reduce((best,q,j)=>distance(q,p)<distance(teeth[best],p)?j:best,0);const a=stage===4?work[i]:1-work[nearest];sprite(3,p[0],p[1],82,37,a)});
 if(!compare&&(stage===5||stage===6))teeth.forEach((p,i)=>{const a=stage===5?work[i]:1-work[i];sprite(4,p[0],p[1],90*Math.sqrt(a),73*Math.sqrt(a),Math.min(1,a*3))});
 ctx.restore();drawDish(t);
 ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);
 if(stage<1||compare){const list=compare?foodSeed.map(([x,y,type],id)=>({x,y,type,id})).concat(wormSeed.map(([x,y],id)=>({x,y,type:'worm',id}))):items;for(const item of list)if(item!==grip)drawFood(item,t);}
 if(grip&&!compare)drawFood(grip,t);ctx.restore();
 for(const p of particles)sprite(stage===1||stage===2?1:stage===3?2:4,p.x,p.y,p.r,p.r,clamp(p.life*2));drawTool();
}

function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{if(stage<0||stage>=8||transition)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer={...point(e),down:true};previous=portrait(pointer);tone(180,.03)});
canvas.addEventListener('pointermove',e=>{if(pointer.down)Object.assign(pointer,point(e))});
function release(e){pointer.down=false;previous=null;
 if(grip){const dropped=e?.type==='pointerup'&&grip.freed&&pointer.x>=dish.x-20&&pointer.x<=dish.x+dish.w+20&&pointer.y>=dish.y-20&&pointer.y<=dish.y+dish.h+20;
 if(dropped){grip.done=true;collected.push({...grip});tone(650,.1)}else if(grip.freed)toast('Drop it into the collection dish below.');
 grip.dx=grip.dy=0;grip.hold=0;grip.freed=false;grip=null;
 if(dropped&&items.every(i=>i.done))complete();}
 for(const i of items)i.hold=0;updateHUD();}

canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
function start(){compare=false;started=true;collected=[];resetDirt();foam=[];particles=[];$('#start').hidden=true;$('#result').hidden=true;$('#tray').hidden=false;document.body.classList.add('playing');setStage(0)}
$('#start').onclick=start;$('#restart').onclick=start;$('#replay').onclick=start;$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';tone()};$('#compare').onpointerdown=e=>{e.currentTarget.setPointerCapture(e.pointerId);compare=true};$('#compare').onpointerup=$('#compare').onpointercancel=()=>compare=false;
$('#jump').innerHTML='<option value="-1">Choose a treatment</option>'+steps.map((s,i)=>`<option value="${i}">${i+1}. ${s[0]}</option>`).join('');$('#jump').onchange=e=>{const n=+e.target.value;if(n<0)return;start();setStage(n)};
Promise.all([load('assets/clean.png'),load('assets/dirty.png'),load('assets/tools.png'),load('assets/worms.png'),load('assets/food.png'),load('assets/descaled.png'),load('assets/polished.png'),load('assets/treatment-fx.png'),load('assets/petri.png')]).then(images=>{[clean,dirty,tools,worms,food,descaled,polished,fx,petri]=images;petri=trimSheet(petri,1,1)[0];fxFrames=trimSheet(fx,3,2);validateSpacing();for(let i=0;i<9;i++){const cell=document.createElement('canvas');cell.width=Math.floor(tools.width/3);cell.height=Math.floor(tools.height/3);const c=cell.getContext('2d');c.drawImage(tools,(i%3)*tools.width/3,Math.floor(i/3)*tools.height/3,tools.width/3,tools.height/3,0,0,cell.width,cell.height);const data=c.getImageData(0,0,cell.width,cell.height).data;let x0=cell.width,y0=cell.height,x1=0,y1=0;for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}const trimmed=document.createElement('canvas');trimmed.width=x1-x0+1;trimmed.height=y1-y0+1;trimmed.getContext('2d').drawImage(cell,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);toolFrames.push(trimmed)}for(let i=0;i<4;i++){
 const cell=document.createElement('canvas');cell.width=Math.floor(food.width/2);cell.height=Math.floor(food.height/2);const c=cell.getContext('2d');c.drawImage(food,(i%2)*food.width/2,Math.floor(i/2)*food.height/2,food.width/2,food.height/2,0,0,cell.width,cell.height);
 const data=c.getImageData(0,0,cell.width,cell.height).data;let x0=cell.width,y0=cell.height,x1=0,y1=0;
 for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 const trimmed=document.createElement('canvas');trimmed.width=x1-x0+1;trimmed.height=y1-y0+1;trimmed.getContext('2d').drawImage(cell,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);foodFrames.push(trimmed);
 }
 resetDirt();items=makeDebris();updateHUD();let last=performance.now();function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;clock+=dt;update(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);draw(clock);requestAnimationFrame(frame)}requestAnimationFrame(frame)}).catch(()=>{$('#title').textContent='Artwork could not load';$('#instruction').textContent='Start the prototype with the command in README.md.'});

function trimSheet(im,cols,rows){return Array.from({length:cols*rows},(_,i)=>{const cell=document.createElement('canvas');cell.width=im.width/cols;cell.height=im.height/rows;const c=cell.getContext('2d');c.drawImage(im,(i%cols)*cell.width,Math.floor(i/cols)*cell.height,cell.width,cell.height,0,0,cell.width,cell.height);const data=c.getImageData(0,0,cell.width,cell.height).data;let x0=cell.width,y0=cell.height,x1=0,y1=0;for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d').drawImage(cell,x0,y0,out.width,out.height,0,0,out.width,out.height);return out})}
function validateSpacing(){for(const [x,y] of foodSeed)for(const [wx,wy] of wormSeed){if(x+28>wx-28&&x-28<wx+28&&y+28>wy-18&&y-28<wy+72)throw new Error('Food overlaps a reserved worm space')}}
