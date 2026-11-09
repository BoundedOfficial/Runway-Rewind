const { setTimeout: wait } = require('node:timers/promises');

async function createStagePointer(page, input, point, { moveDelay, downDelay }) {
  const session = input === 'touch' && await page.context().newCDPSession(page);
  const touch = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });

  async function move(x, y) {
    const position = point(x, y);
    if (session) await touch('touchMove', [position]);
    else await page.mouse.move(position.x, position.y);
    await wait(moveDelay);
  }

  async function down(x, y) {
    if (session) await touch('touchStart', [point(x, y)]);
    else {
      await move(x, y);
      await page.mouse.down();
    }
    await wait(downDelay);
  }

  const up = () => session ? touch('touchEnd', []) : page.mouse.up();

  return { move, down, up };
}

module.exports = { createStagePointer };
