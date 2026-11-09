'use strict';

window.mountRunwayDevelopmentControls = (setPaused, restartRun) => {
  const controls = document.createElement('div');
  controls.id = 'development-controls';
  Object.assign(controls.style, { position: 'fixed', top: '8px', right: '8px', display: 'flex', gap: '4px' });
  const pause = document.createElement('button');
  const restart = document.createElement('button');
  pause.textContent = 'Pause';
  restart.textContent = 'Restart makeover';
  let paused = false;
  function setPause(value) {
    paused = value;
    pause.textContent = paused ? 'Resume' : 'Pause';
    setPaused(paused);
  }
  pause.addEventListener('click', () => setPause(!paused));
  restart.addEventListener('click', () => {
    if (window.confirm('Restart the makeover and discard current progress?')) {
      restartRun();
      setPause(false);
    }
  });
  controls.append(pause, restart);
  document.body.append(controls);
};
