const { setTimeout: wait } = require('node:timers/promises');

const extractionHold = 900;
const pimples = [[257, 232], [346, 259], [389, 270], [249, 286], [219, 444],
  [351, 416], [431, 418], [420, 432], [383, 453], [418, 493], [246, 531],
  [406, 528], [291, 574], [343, 572]];

function aimPimple(move, [x, y]) {
  return move(x - 28, y + 24);
}

async function holdPimples(move, points = pimples) {
  for (const target of points) {
    await aimPimple(move, target);
    await wait(extractionHold);
  }
}

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

module.exports = { createStagePointer, aimPimple, holdPimples, pimples, extractionHold };
