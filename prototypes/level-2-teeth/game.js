/* Throwaway gameplay prototype: does a ten-treatment gross-to-clean dental sequence feel satisfying? */
const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d');
const $=s=>document.querySelector(s),W=640,H=960;
const load=src=>new Promise((resolve,reject)=>{const im=new Image;im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
const steps=[
 ['Pick out the leftovers','Hold a food scrap, then pull it away.','TWEEZERS',0,'pull'],
 ['Uninvited guests','Hold a worm, then slowly pull it free.','TWEEZERS',0,'pull'],
 ['Crack the crust','Scrape across the rough yellow buildup.','DENTAL SCALER',1,'scrape'],
 ['Clean the tight spots','Hold the rotating tip over the dark gaps.','DENTAL HANDPIECE',2,'hold'],
 ['Floss the gaps','Sweep the floss between neighboring teeth.','FLOSS PICK',3,'floss'],
 ['A little mint magic','Hold the tube over each row to add paste.','TOOTHPASTE',4,'paste'],
 ['Brush it all away','Brush back and forth across every tooth.','TOOTHBRUSH',5,'brush'],
 ['Clear the foam','Move the suction tip through the bubbles.','SUCTION',7,'suction'],
 ['The fresh finish','Drag across the smile to swish the mouthwash.','MOUTHWASH',6,'rinse'],
 ['Make it shine','Buff each tooth with the little polishing cup.','POLISHER',8,'polish']
];
// Coordinates use the registered 640×960 plates before the gameplay camera zoom.
const teeth=[[80,381],[128,380],[193,388],[275,390],[378,390],[459,384],[521,377],[563,380],[93,482],[156,507],[225,521],[293,526],[359,526],[424,520],[484,506],[539,480]];
const gaps=[[101,396],[158,405],[223,422],[326,430],[426,417],[491,400],[548,395],[126,504],[193,532],[259,544],[326,548],[392,540],[457,528],[516,505]];
const pastePoints=[[135,392],[278,402],[410,400],[506,390],[178,520],[310,533],[442,520]];
const foodSeed=[[102,416,'leaf'],[165,413,'corn'],[225,432,'meat'],[329,437,'leaf'],[425,418,'seed'],[493,409,'meat'],[547,405,'corn'],[130,508,'leaf'],[207,538,'meat'],[326,547,'corn'],[457,530,'leaf'],[516,509,'seed']];
const wormSeed=[[155,394],[326,412],[487,407],[260,537]];
let stage=-1,work=[],items=[],foam=[],particles=[],grip=null,pulling=false,pointer={x:520,y:785,down:false},previous=null,transition=0,clock=0,compare=false,sound=false,audio,rinse=0,toolArrival=0,started=false;
let clean,dirty,tools,worms,food,dirtyLayer,dc,toolFrames=[],foodFrames=[];
const camera={x:-70.4,y:-97.9,scale:1.22};
const screen=p=>[camera.x+p[0]*camera.scale,camera.y+p[1]*camera.scale];
const portrait=p=>[(p.x-camera.x)/camera.scale,(p.y-camera.y)/camera.scale];
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function tone(f=520,d=.06){if(!sound)return;audio??=new AudioContext;audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.55,audio.currentTime+d);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),1600)}
function resetDirt(){dirtyLayer=document.createElement('canvas');dirtyLayer.width=W;dirtyLayer.height=H;dc=dirtyLayer.getContext('2d');dc.drawImage(dirty,0,0,W,H)}
function targets(){if(stage===3||stage===4)return gaps;if(stage===5)return pastePoints;return teeth}
function setStage(n){stage=n;transition=0;grip=null;pointer.down=false;previous=null;toolArrival=clock;rinse=0;
 if(n===10){$('#tray').hidden=true;$('#result').hidden=false;toast('Now that’s a transformation.');tone(880,.3);updateHUD();return}
 work=targets().map(()=>0);if(n===0)items=foodSeed.map(([x,y,type],i)=>({x,y,type,id:i,done:false}));if(n===1)items=wormSeed.map(([x,y],i)=>({x,y,type:'worm',id:i,done:false}));
 if(n===7&&foam.length<20)for(const p of teeth)for(let i=0;i<4;i++)foam.push({x:p[0]+Math.sin(i*2)*17,y:p[1]+Math.cos(i*2)*15,r:8+i*2});
 updateHUD();}
function updateHUD(){const progress=stage<0?0:stage<2?items.filter(i=>i.done).length/items.length:stage===8?rinse:work.reduce((a,b)=>a+b,0)/work.length;
 $('#steps').innerHTML=steps.map((_,i)=>`<i class="${i<stage?'done':i===stage?'active':''}"></i>`).join('');
 if(stage>=0&&stage<10){$('#stepNumber').textContent=`${String(stage+1).padStart(2,'0')} / 10`;$('#title').textContent=steps[stage][0];$('#instruction').textContent=grip?'Keep pulling…':steps[stage][1];$('#toolLabel').textContent=steps[stage][2];$('#counter').textContent=stage<2?`${items.filter(i=>i.done).length} / ${items.length} removed`:`${Math.round(progress*100)}%`;$('#progress').style.width=`${progress*100}%`;$('#jump').value=stage;}
 $('#state').textContent=stage<0?'Ready to begin':stage===10?'All treatments complete':`Treatment ${stage+1}: ${steps[stage][4]} · ${Math.round(progress*100)}% · ${grip?'gripping':'ready'}`;
 return progress;}
function burst(x,y,color,n=10){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*100,vy:-40-Math.random()*90,life:.5+Math.random()*.4,color,r:2+Math.random()*4})}
function erase(x,y,r,alpha){dc.save();dc.globalCompositeOperation='destination-out';dc.globalAlpha=alpha;const g=dc.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#000');g.addColorStop(.65,'#000');g.addColorStop(1,'#0000');dc.fillStyle=g;dc.fillRect(x-r,y-r,r*2,r*2);dc.restore()}
function complete(){if(transition||stage<0||stage>=10)return;transition=clock+.9;pointer.down=false;grip=null;tone(720,.18);toast(['Leftovers cleared.','All guests evicted.','That crust had to go.','Fresh spaces.','Nothing left between them.','Ready to brush.','What a difference.','Foam cleared.','Minty fresh.','A smile worth showing.'][stage]);}
function update(dt){if(transition&&clock>transition){setStage(stage+1);return}if(!pointer.down||stage<0||stage>=10||transition)return;
 const p=portrait(pointer),speed=previous?distance(p,previous):0;
 if(stage<2){if(!grip){const item=items.find(i=>!i.done&&distance([i.x,i.y],p)<31);if(item){item.hold=(item.hold||0)+dt;if(item.hold>.24){grip=item;grip.start=p;grip.dx=grip.dy=0;tone(320);updateHUD()}}for(const item of items)if(!item.done&&distance([item.x,item.y],p)>=31)item.hold=0;}
 else {grip.dx=p[0]-grip.start[0];grip.dy=p[1]-grip.start[1];if(Math.hypot(grip.dx,grip.dy)>(stage===1?88:65)){const q=screen([grip.x+grip.dx,grip.y+grip.dy]);burst(q[0],q[1],stage===1?'#d9b38d':'#b89b49',12);grip.done=true;grip=null;tone(stage===1?240:420,.13);if(items.every(i=>i.done))complete();}}}
 else if(stage===8){if(p[0]>50&&p[0]<590&&p[1]>320&&p[1]<580){rinse=clamp(rinse+Math.min(speed,45)/1200);if(rinse>=1)complete()}}
 else {const points=targets();for(let i=0;i<points.length;i++){if(work[i]>=1)continue;const target=points[i];const reach=stage===3?24:stage===4?30:stage===5?47:48;
 let hit=distance(p,target)<reach;if(previous&&speed>0){const dx=p[0]-previous[0],dy=p[1]-previous[1],t=clamp(((target[0]-previous[0])*dx+(target[1]-previous[1])*dy)/(speed*speed));hit ||= distance([previous[0]+dx*t,previous[1]+dy*t],target)<reach;}
 if(!hit)continue;const hold=[3,5,7,9].includes(stage);const amount=hold?dt/(stage===3?.55:stage===5?.4:stage===7?.4:.5):Math.min(speed,50)/(stage===6?165:stage===2?125:95);if(amount<=0)continue;
 work[i]=clamp(work[i]+amount);if([2,3,4,6].includes(stage))erase(p[0],p[1],stage===6?57:34,stage===6?.16:.065);
 if(stage===6&&Math.random()<.6)foam.push({x:p[0]+(Math.random()-.5)*38,y:p[1]+(Math.random()-.5)*20,r:7+Math.random()*12});
 if(stage===7)foam=foam.filter(f=>distance([f.x,f.y],p)>65);
 if(work[i]>=1){const q=screen(target);burst(q[0],q[1],stage===2?'#9b712c':stage===9?'#ffffd7':'#bff8e4',stage===2?9:5);tone(stage===9?900:500,.04);if(stage===6)erase(target[0],target[1],75,.92);}}
 if(work.every(v=>v>=1)){if(stage===6){dc.clearRect(0,0,W,H)}if(stage===7)foam=[];complete();}}
 previous=p;updateHUD();}
function drawFood(item,t){
 if(item.done)return;let x=item.x,y=item.y;
 if(grip===item){x+=item.dx||0;y+=item.dy||0;}
 ctx.save();ctx.translate(x,y);ctx.shadowColor='#29150e70';ctx.shadowBlur=2;ctx.shadowOffsetY=1.5;
 if(item.type==='worm'){
  const frame=Math.floor(t*7+item.id*1.7)%6,sw=worms.width/3,sh=worms.height/2;
  const stretch=grip===item?1+Math.min(.22,Math.hypot(item.dx||0,item.dy||0)/400):1;
  ctx.drawImage(worms,(frame%3)*sw,Math.floor(frame/3)*sh,sw,sh,-40,-13,80,80*stretch);
 }else{
  const index={leaf:0,corn:1,meat:2,seed:3}[item.type],im=foodFrames[index];
  const width=[36,27,43,33][index],height=width*im.height/im.width;
  ctx.rotate([-.3,.2,1.15,.95][index]+(item.id%3-1)*.14);
  ctx.drawImage(im,-width/2,-height/2,width,height);
 }
 ctx.restore();
}
function star(x,y,r,a=1){ctx.save();ctx.translate(x,y);ctx.globalAlpha=a;ctx.fillStyle='#fffde0';ctx.shadowColor='white';ctx.shadowBlur=15;ctx.beginPath();for(let i=0;i<8;i++){let radius=i%2?r*.19:r;ctx.lineTo(Math.cos(i*Math.PI/4)*radius,Math.sin(i*Math.PI/4)*radius)}ctx.closePath();ctx.fill();ctx.restore()}
function drawTool(){const ctx=$("#toolCanvas").getContext("2d");ctx.clearRect(0,0,W,H);if(stage<0||stage>=10)return;const idx=steps[stage][3],im=toolFrames[idx];if(!im)return;const active=pointer.down&&!transition;const size=idx===6?150:230;const ratio=im.width/im.height;const width=Math.min(180,size*ratio);let x=active?pointer.x:535,y=active?pointer.y:709;const arrival=clamp((clock-toolArrival)/.45);if(!active)x+=(1-arrival)*240;
 ctx.save();ctx.translate(x,y);const angle=active?(stage===8?-.4:stage===3?Math.sin(clock*90)*.025:stage===6?Math.sin(clock*24)*.10:Math.sin(clock*9)*.025):-.12;ctx.rotate(angle);ctx.shadowColor='#14352d55';ctx.shadowBlur=8;ctx.shadowOffsetY=7;const head=idx===6?.18:idx===3?.08:idx===5?.1:.035;ctx.drawImage(im,-width/2,-size*head,width,size);ctx.restore();}
function draw(t){ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(camera.scale,camera.scale);ctx.drawImage(clean,0,0,W,H);if(compare||stage<7)ctx.drawImage(compare?dirty:dirtyLayer,0,0,W,H);
 if(stage<2||compare){const list=compare?foodSeed.map(([x,y,type],id)=>({x,y,type,id})).concat(wormSeed.map(([x,y],id)=>({x,y,type:'worm',id}))):stage===1?items:items.concat(wormSeed.map(([x,y],id)=>({x,y,type:'worm',id})));for(const item of list)drawFood(item,t);}
 if(stage===5||stage===6){pastePoints.forEach((p,i)=>{const a=stage===5?work[i]:1-work[teeth.findIndex(q=>distance(q,p)<70)]||0;if(a>0){ctx.save();ctx.globalAlpha=clamp(a);ctx.strokeStyle='#c7f6de';ctx.lineWidth=17;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p[0]-14,p[1]);ctx.quadraticCurveTo(p[0],p[1]-10,p[0]+15,p[1]);ctx.stroke();ctx.strokeStyle='#f7fffa';ctx.lineWidth=5;ctx.stroke();ctx.restore()}})}
 if(stage===6||stage===7)for(const f of foam){const g=ctx.createRadialGradient(f.x-3,f.y-3,1,f.x,f.y,f.r);g.addColorStop(0,'#ffffffff');g.addColorStop(.7,'#e6fff4cc');g.addColorStop(1,'#c3f5e880');ctx.fillStyle=g;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,7);ctx.fill();}
 if(stage===8){ctx.save();ctx.beginPath();ctx.ellipse(320,455,265,106,0,0,7);ctx.clip();ctx.fillStyle='#59cfc54d';ctx.beginPath();ctx.moveTo(0,590);for(let x=0;x<=640;x+=8)ctx.lineTo(x,420+Math.sin(x*.024+t*4)*24);ctx.lineTo(640,590);ctx.fill();for(let i=0;i<20;i++){ctx.strokeStyle='#d8fff7aa';ctx.beginPath();ctx.arc((i*83+t*26)%600+20,450+Math.sin(i+t)*52,3+i%5,0,7);ctx.stroke()}ctx.restore();}
 if(stage>=9&&!compare){teeth.forEach((p,i)=>{const a=stage===10?1:work[i];if(a>.8)star(p[0]+13,p[1]-14,6+Math.sin(t*3+i)*3,.65+Math.sin(t*3+i)*.3)})}ctx.restore();
 for(const p of particles){ctx.fillStyle=p.color;ctx.globalAlpha=clamp(p.life*2);ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fill()}ctx.globalAlpha=1;drawTool();}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{if(stage<0||stage>=10||transition)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer={...point(e),down:true};previous=portrait(pointer);tone(180,.03)});
canvas.addEventListener('pointermove',e=>{if(pointer.down)Object.assign(pointer,point(e))});
function release(){pointer.down=false;previous=null;if(grip){grip.dx=grip.dy=0;grip.hold=0;grip=null}for(const i of items)i.hold=0;updateHUD()}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
function start(){compare=false;started=true;resetDirt();foam=[];particles=[];$('#start').hidden=true;$('#result').hidden=true;$('#tray').hidden=false;document.body.classList.add('playing');setStage(0)}
$('#start').onclick=start;$('#restart').onclick=start;$('#replay').onclick=start;$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';tone()};$('#compare').onpointerdown=e=>{e.currentTarget.setPointerCapture(e.pointerId);compare=true};$('#compare').onpointerup=$('#compare').onpointercancel=()=>compare=false;
$('#jump').innerHTML='<option value="-1">Choose a treatment</option>'+steps.map((s,i)=>`<option value="${i}">${i+1}. ${s[0]}</option>`).join('');$('#jump').onchange=e=>{const n=+e.target.value;if(n<0)return;start();if(n>=7)dc.clearRect(0,0,W,H);else if(n>=3){for(const p of teeth)erase(p[0],p[1],60,.45)}setStage(n)};
Promise.all([load('assets/clean.png'),load('assets/dirty.png'),load('assets/tools.png'),load('assets/worms.png'),load('assets/food.png')]).then(images=>{[clean,dirty,tools,worms,food]=images;for(let i=0;i<9;i++){const cell=document.createElement('canvas');cell.width=Math.floor(tools.width/3);cell.height=Math.floor(tools.height/3);const c=cell.getContext('2d');c.drawImage(tools,(i%3)*tools.width/3,Math.floor(i/3)*tools.height/3,tools.width/3,tools.height/3,0,0,cell.width,cell.height);const data=c.getImageData(0,0,cell.width,cell.height).data;let x0=cell.width,y0=cell.height,x1=0,y1=0;for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}const trimmed=document.createElement('canvas');trimmed.width=x1-x0+1;trimmed.height=y1-y0+1;trimmed.getContext('2d').drawImage(cell,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);toolFrames.push(trimmed)}for(let i=0;i<4;i++){
 const cell=document.createElement('canvas');cell.width=Math.floor(food.width/2);cell.height=Math.floor(food.height/2);const c=cell.getContext('2d');c.drawImage(food,(i%2)*food.width/2,Math.floor(i/2)*food.height/2,food.width/2,food.height/2,0,0,cell.width,cell.height);
 const data=c.getImageData(0,0,cell.width,cell.height).data;let x0=cell.width,y0=cell.height,x1=0,y1=0;
 for(let y=0;y<cell.height;y++)for(let x=0;x<cell.width;x++)if(data[(y*cell.width+x)*4+3]>100){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y)}
 const trimmed=document.createElement('canvas');trimmed.width=x1-x0+1;trimmed.height=y1-y0+1;trimmed.getContext('2d').drawImage(cell,x0,y0,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);foodFrames.push(trimmed);
 }
 resetDirt();items=foodSeed.map(([x,y,type],id)=>({x,y,type,id,done:false}));updateHUD();let last=performance.now();function frame(now){const dt=Math.min(.04,(now-last)/1000);last=now;clock+=dt;update(dt);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);draw(clock);requestAnimationFrame(frame)}requestAnimationFrame(frame)}).catch(()=>{$('#title').textContent='Artwork could not load';$('#instruction').textContent='Start the prototype with the command in README.md.'});
