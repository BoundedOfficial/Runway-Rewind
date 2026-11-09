/* Asset compiler: rasterizes authored alpha masks and registers generated plates.
 * Image generation/editing is performed by imagegen; this is game sprite assembly. */
const fs=require('node:fs'),path=require('node:path');
const levelDirectory=process.argv[2];
if(!levelDirectory||process.argv.length!==3){console.error('Usage: node build-layers.cjs <level-directory>');process.exit(1);}
const root=path.resolve(levelDirectory),out=path.join(root,'assets/layers');
for(const required of ['authoring/layers.json','assets/plates','src']){if(!fs.existsSync(path.join(root,required))){console.error('Missing level input: '+path.join(root,required));process.exit(1);}}
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
 const page=await browser.newPage();await page.setContent('<title>Original sprite compiler</title>');const definitions=JSON.parse(fs.readFileSync(path.join(root,'authoring/layers.json'),'utf8'));await page.evaluate(defs=>{window.ROSE_LAYER_DEFS=defs;window.ROSE_PLATES=[...new Set(defs.map(d=>d.plate))];},definitions);
 const platePaths=fs.readdirSync(path.join(root,'assets/plates')).filter(n=>n.endsWith('.png'));
 const urls=Object.fromEntries(platePaths.map(n=>[n.slice(0,-4),'data:image/png;base64,'+fs.readFileSync(path.join(root,'assets/plates',n)).toString('base64')]));
 const result=await page.evaluate(async(urls)=>{
  const W=640,H=960,plates={};const make=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;return c;};
  await Promise.all(ROSE_PLATES.map(async n=>{const im=new Image();im.src=urls[n];await im.decode();plates[n]=im;}));
  function shape(c,s){c.fillStyle='white';if(s.rect)c.fillRect(...s.rect);if(s.ellipse){c.beginPath();c.ellipse(...s.ellipse,0,0,Math.PI*2);c.fill();}if(s.path){const p=new Path2D(s.path);c.fill(p);if(s.expand){c.strokeStyle='white';c.lineWidth=s.expand*2;c.lineJoin='round';c.stroke(p);}}}
  const output=[];
  for(const def of ROSE_LAYER_DEFS){
   const mask=make(),mc=mask.getContext('2d');shape(mc,def.shape);
   if(def.shape.subtract){mc.globalCompositeOperation='destination-out';for(const s of def.shape.subtract)shape(mc,s);mc.globalCompositeOperation='source-over';}
   if(def.shape.intersect){const clip=make();shape(clip.getContext('2d'),def.shape.intersect);mc.globalCompositeOperation='destination-in';mc.drawImage(clip,0,0);mc.globalCompositeOperation='source-over';}
   const feathered=make(),fc=feathered.getContext('2d');fc.filter=`blur(${def.feather}px)`;fc.drawImage(mask,0,0);fc.filter='none';
   const hit=make(),hc=hit.getContext('2d');if(def.hitShape)shape(hc,def.hitShape);else{hc.fillStyle='white';hc.fillRect(0,0,W,H);}const hitPixels=hc.getImageData(0,0,W,H).data;
   const excluded=make(),ec=excluded.getContext('2d');for(const s of def.hitSubtract||[])shape(ec,s);const excludedPixels=ec.getImageData(0,0,W,H).data;
   const pixels=fc.getImageData(0,0,W,H).data;let left=W,top=H,right=0,bottom=0,count=0;const cells=[];
   for(let y=0;y<H;y++)for(let x=0;x<W;x++){const alpha=pixels[(y*W+x)*4+3];if(alpha>2){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}if(alpha>160&&hitPixels[(y*W+x)*4+3]>160&&excludedPixels[(y*W+x)*4+3]<128&&x%6===0&&y%6===0){cells.push([x,y]);count++;}}
   const width=right-left+1,height=bottom-top+1,art=make(),ac=art.getContext('2d');ac.drawImage(plates[def.plate],0,0,W,H);ac.globalCompositeOperation='destination-in';ac.drawImage(feathered,0,0);
   const crop=document.createElement('canvas');crop.width=width;crop.height=height;crop.getContext('2d').drawImage(art,left,top,width,height,0,0,width,height);
   const maskCrop=document.createElement('canvas');maskCrop.width=width;maskCrop.height=height;maskCrop.getContext('2d').drawImage(feathered,left,top,width,height,0,0,width,height);
   output.push({...def,x:left,y:top,width,height,cells,png:crop.toDataURL('image/png').split(',')[1],maskPng:maskCrop.toDataURL('image/png').split(',')[1]});
  }
  return output;
 },urls);
 fs.mkdirSync(out,{recursive:true});const manifest=[];
 for(const {png,maskPng,...d} of result){if(!d.cells.length)throw Error('Empty hit mask '+d.id);fs.writeFileSync(path.join(out,d.id+'.png'),Buffer.from(png,'base64'));fs.writeFileSync(path.join(out,d.id+'.mask.png'),Buffer.from(maskPng,'base64'));manifest.push({...d,image:'assets/layers/'+d.id+'.png',mask:'assets/layers/'+d.id+'.mask.png'});}
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));fs.writeFileSync(path.join(root,'src/sprites.js'),'// Original registered raster sprites and independent hit masks.\nwindow.ROSE_SPRITES='+JSON.stringify(manifest)+';\n');
 console.log(`Built ${manifest.length} transparent artwork sprites + ${manifest.length} masks from active registered character plates.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
