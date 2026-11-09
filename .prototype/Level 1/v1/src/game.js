/* Raster-layer makeover: original imagegen sprites, independently authored scratch masks.
 * A soft brush reveals the next registered image layer through a single alpha mask.
 * No procedural cosmetic illustrations and no extracted game art at runtime. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),W=640,H=960,canvas=$('scene'),ctx=canvas.getContext('2d');
 const make=(w=W,h=H)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
 const sprites=Object.fromEntries(window.ROSE_SPRITES.map(d=>[d.id,{...d}])),images={};
 const ids=prefix=>Object.keys(sprites).filter(k=>k.startsWith(prefix));
 const steps=[
  [2,'Pop every pimple','Precision extractor',0,'Press each highlighted blemish to flatten it.','pop',ids('extract-')],
  [4,'Smother in cream','Cream spatula',2,'Spread a thick layer of cleansing cream over forehead and cheeks.','spread',ids('cream-')],
  [5,'Reveal clean skin','Wet cotton wipe',3,'Wipe away the cream, residue and grime, from forehead down to neck.','wipe',ids('clean-')],
  ['robe','Freshen the robe','Fabric cleaning pad',1,'Wipe both sides of the robe to restore the teal silk and golden flowers.','wipe',ids('robe-')],
  [6,'Tame those brows','Eyebrow razor',4,'Shave both unruly brows into clean, slender arches.','wipe',ids('brow-clean-')],
  [7,'Sugar-coat the lips','Lip scrub brush',5,'Coat the cracked lips with a thick sugar scrub.','spread',['scrub']],
  [8,'Peel & hydrate','Lip sponge',6,'Remove the scrub and flakes to reveal soft hydrated lips.','wipe',['hydrated-lips']],
  [9,'Porcelain base','Foundation sponge',7,'Blend luminous foundation over the face and neck.','spread',['foundation']],
  [12,'Sculpt the brows','Angled brow brush',10,'Fill both brows into full, defined arches.','spread',['brow-L','brow-R']],
  [20,'Dramatic eyes','Eye makeup brush',11,'Sweep over each eye to reveal shimmer, winged liner and full lashes together.','spread',ids('eye-look-')],
  [23,'A rose glow','Blush brush',14,'Sweep both cheeks and the nose for rosy blush and sculpted definition.','spread',[...ids('blush-'),...ids('contour-')]],
  [24,'Crimson lips','Crimson lipstick',15,'Turn natural lips into rich crimson color.','spread',['lipstick']],
  [null,'Style the hair','Styling brush',16,'Brush the highlighted hair on both sides to create the updo and add the camellia.','style',ids('style-')]
 ].map(([sourceIndex,title,tool,icon,instruction,kind,targets])=>({sourceIndex,title,tool,icon,instruction,kind,targets}));
 let committed=make(),before=make(),groups=[],stage=0,selected=false,complete=false,finished=false,ready=false,transitioning=false,dragging=false,pointer=null,last=null,particles=[],transitionTimer;
 let view={scale:1,x:320,y:480},targetView={...view},lastTime=0,finishTime=0;
 const keys=new Set();
 const load=async(url)=>{const im=new Image();im.src=url;await im.decode();return im;};
 function drawSprite(c,s){c.drawImage(s.art,s.x,s.y,s.width,s.height);}
 function toolDraw(c,icon,x,y,size){if(icon===16){c.drawImage(images.brush,x,y,size,size);return;}const sw=images.tools.width/4,sh=images.tools.height/4;c.drawImage(images.tools,(icon%4)*sw,Math.floor(icon/4)*sh,sw,sh,x,y,size,size);}
 function buildGroups(){groups=steps[stage].targets.map(id=>{const s=sprites[id];return{s,reveal:make(s.width,s.height),visible:make(s.width,s.height),work:make(s.width,s.height),cells:s.cells.map(([x,y])=>({x,y,hit:false})),hit:0,done:false,dirty:true,settleStart:0,settled:false};});}
 function camera(){targetView=steps[stage].sourceIndex===20?{scale:1.23,x:320,y:400}:[7,8,24].includes(steps[stage].sourceIndex)?{scale:1.12,x:320,y:490}:{scale:1,x:320,y:480};}
 function fraction(){return groups.length?groups.reduce((sum,g)=>sum+Math.min(1,g.hit/g.cells.length/.8),0)/groups.length:0;}
 function updateProgress(){const p=complete?100:Math.min(99,Math.round(fraction()*100));$('percent').textContent=p+'%';$('progress').style.width=p+'%';$('total-percent').textContent=Math.round((stage+p/100)/steps.length*100)+'%';$('status').textContent=finished?'Transformation complete':complete?'Treatment complete':selected?`${groups.filter(g=>g.done).length} / ${groups.length} areas complete`:'Pick up your tool';}
 function updateUI(){const s=steps[stage],chapter=stage<7?0:stage<12?1:2;
  $('stage-count').textContent=`${String(stage+1).padStart(2,'0')} / ${steps.length}`;$('tool-step').textContent=`TREATMENT ${String(stage+1).padStart(2,'0')}`;$('step-title').textContent=s.title;$('tool-name').textContent=s.tool;
  $('instruction').textContent=finished?'Your transformation is complete. Drag the slider to compare.':complete?'That\u2019s the transformation. Ready for the next treatment?':s.instruction;
  $('tool').disabled=!ready||complete||finished||transitioning;$('tool').setAttribute('aria-pressed',String(selected));$('tool-action').textContent=complete?'\u2713 Treatment complete':selected?'Ready \u00b7 use on highlighted areas':'Pick up & transform';
  $('next').hidden=!complete||finished;$('next').textContent=stage===steps.length-1?'The big reveal \u2726':'Next treatment \u2192';$('hint').hidden=finished;
  $('hint').textContent=complete?'Satisfying, isn\u2019t it? \u2726':selected?(s.kind==='pop'?'Press each highlighted pimple':'Drag across the highlighted areas'):`Pick up the ${s.tool.toLowerCase()}`;
  $('chapter-number').textContent='0'+(chapter+1);$('chapter-title').textContent=['The deep clean','Build the glamour','The transformation'][chapter];
  const lo=chapter===0?0:chapter===1?7:12,hi=chapter===0?7:chapter===1?12:steps.length;
  $('step-list').innerHTML=steps.slice(lo,hi).map((s,i)=>`<li class="${i+lo===stage?'active':i+lo<stage?'done':''}"><span>${i+lo<stage?'\u2713':String(i+lo+1).padStart(2,'0')}</span>${s.title}</li>`).join('');
  $('dots').innerHTML=steps.map((_,i)=>`<i class="${i<stage||i===stage&&complete?'done':''}"></i>`).join('');
  $('swatches').innerHTML=(stage>=7?['#a04945','#cb8b76','#e9d5a0','#a6102b']:['#a5e8dc','#f5e0b7','#b1a0ef']).map(color=>`<i style="background:${color}"></i>`).join('');
  const c=$('tool-preview').getContext('2d');c.clearRect(0,0,240,240);if(ready)toolDraw(c,s.icon,15,10,210);canvas.style.cursor=selected&&!complete?'none':'default';updateProgress();
 }
 function burst(x,y){for(let i=0;i<12;i++)particles.push({x,y,vx:Math.cos(i*2.4)*(20+i*3),vy:Math.sin(i*2.4)*(20+i*3),life:1});}
 function finishGroup(g){g.done=true;g.hit=g.cells.length;for(const p of g.cells)p.hit=true;g.settleStart=performance.now();g.dirty=true;const a=g.s.anchor||[g.s.x+g.s.width/2,g.s.y+g.s.height/2];burst(...a);}
 // Brush alpha is soft like the exported reference brush. It only controls reveal;
 // the authored sprite mask is multiplied exactly once, preventing edge ghosts.
 const stamps=new Map();
 function brushStamp(r){if(stamps.has(r))return stamps.get(r);const c=make(r*2+2,r*2+2),x=c.getContext('2d'),gr=x.createRadialGradient(r+1,r+1,r*.65,r+1,r+1,r);gr.addColorStop(0,'#ffffffff');gr.addColorStop(1,'#ffffff00');x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);stamps.set(r,c);return c;}
 function revealStroke(g,a,p,r){const c=g.reveal.getContext('2d'),stamp=brushStamp(r),length=Math.hypot(p.x-a.x,p.y-a.y),n=Math.max(1,Math.ceil(length/(r*.2)));for(let i=0;i<=n;i++){const t=i/n;c.drawImage(stamp,a.x+(p.x-a.x)*t-g.s.x-r-1,a.y+(p.y-a.y)*t-g.s.y-r-1);}g.dirty=true;}
 function updateVisible(g,time){if(!g.dirty&&(!g.done||g.settled))return;const w=g.work.getContext('2d');w.clearRect(0,0,g.s.width,g.s.height);w.drawImage(g.reveal,0,0);if(g.done){const t=Math.min(1,(time-g.settleStart)/(steps[stage].kind==='style'?700:320)),ease=t*t*(3-2*t);w.globalAlpha=ease;w.fillStyle='#fff';w.fillRect(0,0,g.s.width,g.s.height);w.globalAlpha=1;g.settled=t===1;}const c=g.visible.getContext('2d');c.clearRect(0,0,g.s.width,g.s.height);c.drawImage(g.s.art,0,0);c.globalCompositeOperation='destination-in';c.drawImage(g.work,0,0);c.globalCompositeOperation='source-over';g.dirty=false;}
 function finishStep(){complete=true;dragging=false;last=null;const c=committed.getContext('2d');for(const g of groups)drawSprite(c,g.s);updateUI();}
 function dist(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,q=dx*dx+dy*dy,t=q?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/q)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
 function apply(p){if(!ready||!selected||complete||finished||transitioning)return;const s=steps[stage],a=last||p,r=s.kind==='style'?62:s.kind==='pop'?15:steps[stage].sourceIndex===12?26:42;
  for(const g of groups){if(g.done)continue;
   if(s.kind==='pop'){const [x,y]=g.s.anchor;if(Math.hypot(p.x-x,p.y-y)<Math.max(14,Math.min(g.s.width,g.s.height)*.32))finishGroup(g);continue;}
   let touched=false;for(const c of g.cells)if(dist(c,a,p)<r*.65){touched=true;if(!c.hit){c.hit=true;g.hit++;}}if(!touched)continue;
   revealStroke(g,a,p,r);
   if(g.hit/g.cells.length>=.8)finishGroup(g);
  }
  last=p;updateProgress();
 }
 function enterStage(animate=false){selected=false;complete=false;dragging=false;pointer=null;last=null;keys.clear();buildGroups();camera();transitioning=false;clearTimeout(transitionTimer);$('transition').hidden=true;
  if(animate&&[9,10].includes(stage)){transitioning=true;$('transition').hidden=false;$('transition-label').textContent=stage===9?'A touch of rose':'Load the next shade';transitionTimer=setTimeout(()=>{transitioning=false;$('transition').hidden=true;updateUI();},550);}updateUI();}
 function reset(){clearTimeout(transitionTimer);stage=0;finished=false;particles=[];keys.clear();$('finish').hidden=true;$('compare').value='0';committed.getContext('2d').drawImage(images.dirty,0,0,W,H);before.getContext('2d').drawImage(images.dirty,0,0,W,H);view={scale:1,x:320,y:480};enterStage();}
 function reveal(){finished=true;selected=false;dragging=false;pointer=null;finishTime=performance.now();targetView={scale:1,x:320,y:480};$('finish').hidden=false;burst(240,340);burst(400,340);updateUI();}
 function screenPoint(e){const b=canvas.getBoundingClientRect();return{x:(e.clientX-b.left)/b.width*W,y:(e.clientY-b.top)/b.height*H};}
 function worldPoint(p){return{x:(p.x-W/2)/view.scale+view.x,y:(p.y-H/2)/view.scale+view.y};}
 canvas.addEventListener('pointerdown',e=>{if(!selected||complete||finished||transitioning)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);dragging=true;pointer=screenPoint(e);last=null;apply(worldPoint(pointer));});
 canvas.addEventListener('pointermove',e=>{pointer=screenPoint(e);if(dragging)apply(worldPoint(pointer));});
 function release(){dragging=false;last=null;}
 for(const e of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(e,release);canvas.addEventListener('pointerleave',()=>{if(!dragging)pointer=null;});
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)){e.preventDefault();keys.add(e.code);pointer||={x:320,y:480};}});canvas.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')last=null;});
 canvas.addEventListener('blur',()=>{keys.clear();release();});window.addEventListener('blur',()=>{keys.clear();release();});
 $('tool').onclick=()=>{selected=!selected;pointer=null;last=null;updateUI();if(selected)canvas.focus({preventScroll:true});};$('next').onclick=()=>{if(!complete||finished)return;if(stage===steps.length-1)reveal();else{stage++;enterStage(true);}};$('restart').onclick=()=>{if(ready)reset();};$('replay').onclick=reset;
 function composite(c){c.drawImage(committed,0,0);if(!complete&&!finished)for(const g of groups)c.drawImage(g.visible,g.s.x,g.s.y);}
 function frame(time){const dt=Math.min(.05,(time-lastTime)/1000||0);lastTime=time;view.scale+=(targetView.scale-view.scale)*Math.min(1,dt*8);view.y+=(targetView.y-view.y)*Math.min(1,dt*8);
  if(ready){if(keys.size&&selected&&!complete){pointer||={x:320,y:480};const v=240*dt;pointer.x=Math.max(0,Math.min(W,pointer.x+(keys.has('ArrowRight')?v:0)-(keys.has('ArrowLeft')?v:0)));pointer.y=Math.max(0,Math.min(H,pointer.y+(keys.has('ArrowDown')?v:0)-(keys.has('ArrowUp')?v:0)));if(keys.has('Space'))apply(worldPoint(pointer));}
   if(!complete&&!finished){for(const g of groups)updateVisible(g,time);if(groups.length&&groups.every(g=>g.done&&g.settled))finishStep();}
   ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(320,480);ctx.scale(view.scale,view.scale);ctx.translate(-view.x,-view.y);composite(ctx);
   if(finished){const amount=Number($('compare').value)/100;if(amount){ctx.save();ctx.beginPath();ctx.rect(0,0,W*amount,H);ctx.clip();ctx.drawImage(before,0,0);ctx.restore();ctx.strokeStyle='white';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(W*amount,0);ctx.lineTo(W*amount,H);ctx.stroke();}}
   if(!complete&&!finished){ctx.save();ctx.strokeStyle='#ffffb0';ctx.fillStyle='#ffffd5';ctx.lineWidth=1.7/view.scale;ctx.globalAlpha=selected?.8:.55;
    for(const g of groups){if(g.done)continue;const s=g.s;let x,y,r;if(s.anchor){[x,y]=s.anchor;r=s.hitShape?32:Math.min(s.width,s.height)*.35;}else{x=s.x+s.width/2;y=s.y+s.height/2;r=Math.min(24,s.width/4,s.height/4);}ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();if(!s.anchor){ctx.font='18px sans-serif';ctx.textAlign='center';ctx.fillText('\u2726',x,y+6);}}
    ctx.restore();}
   for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle='#fff5af';ctx.font='22px sans-serif';ctx.fillText('\u2726',p.x,p.y);}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);ctx.restore();
   if(pointer&&selected&&!complete&&!finished&&!transitioning){ctx.strokeStyle='#ffffc7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pointer.x,pointer.y,(steps[stage].kind==='style'?62:steps[stage].kind==='pop'?15:steps[stage].sourceIndex===12?26:42)*view.scale,0,Math.PI*2);ctx.stroke();toolDraw(ctx,steps[stage].icon,pointer.x-50,pointer.y-12,110);}
   if(finished&&time-finishTime<700){ctx.fillStyle=`rgba(255,255,255,${.35*(1-(time-finishTime)/700)})`;ctx.fillRect(0,0,W,H);}
  }requestAnimationFrame(frame);
 }
 window.roseAtelier={getState:()=>({stage,stepCount:steps.length,title:steps[stage].title,sourceIndex:steps[stage].sourceIndex,complete,finished,selected,transitioning,coverage:groups.map(g=>({name:g.s.id,fraction:g.hit/g.cells.length,done:g.done})),view:{...view},assetCount:Object.keys(sprites).length})};
 async function init(){try{let loaded=0,total=Object.keys(sprites).length*2+3;
  const get=async u=>{const im=await load(u);$('loading').textContent=`Preparing the layers\u2026 ${Math.round(++loaded/total*100)}%`;return im;};
  await Promise.all([get('assets/plates/00-dirty.png').then(v=>images.dirty=v),get('assets/plates/10-hairbrush.png').then(v=>images.brush=v),get('assets/tools.png').then(v=>images.tools=v),...Object.values(sprites).flatMap(s=>[get(s.image).then(v=>s.art=v),get(s.mask).then(v=>s.alpha=v)])]);ready=true;$('loading').hidden=true;reset();}catch(e){$('loading').textContent='Could not load the artwork. Reload to try again.';console.error(e);}}
 init();requestAnimationFrame(frame);
})();
