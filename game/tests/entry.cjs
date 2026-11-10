const { setTimeout: wait } = require('node:timers/promises');
async function tapStage(page,x,y) {
  const r=await page.locator('canvas').boundingBox();
  await page.mouse.click(r.x+x*r.width/640,r.y+y*r.height/960,{delay:55});
}
async function enterLevel(page,level=1) {
  await page.locator('#game-loading').waitFor({state:'detached',timeout:30000});
  await wait(100); await tapStage(page,320,480); await wait(100);
  await tapStage(page,level===1?200:440,480); await wait(1850);
  // Dismiss the animated idle hint via ordinary input before artwork comparisons.
  await tapStage(page,10,900); await wait(50);
}
module.exports={enterLevel,tapStage};
