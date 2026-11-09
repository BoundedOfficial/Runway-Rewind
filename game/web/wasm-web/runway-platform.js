'use strict';

const sdk = window.bridge;
let initialized;
let readiness;
let stageStarted = false;
let hostPaused = false;
let hostAudioEnabled = false;
let developerPaused = false;
let paused = false;
let pauseCount = 0;
let restartCount = 0;
let pendingResize;

function updatePause() {
  const next = hostPaused || developerPaused;
  if (paused === next) return;
  paused = next;
  if (paused) pauseCount++;
  if (!stageStarted) return;

  // Defold's bundled Emscripten loop owns both simulation and rendering.
  // Bridge and the debug controls continue receiving browser events while it is suspended.
  if (paused) {
    Module.pauseMainLoop();
  } else {
    pendingResize?.();
    pendingResize = undefined;
    Module.resumeMainLoop();
  }
}

function listenForLifecycle() {
  hostPaused = sdk.platform.isPaused;
  hostAudioEnabled = sdk.platform.isAudioEnabled;
  sdk.platform.on(sdk.EVENT_NAME.PAUSE_STATE_CHANGED, value => {
    hostPaused = value;
    updatePause();
  });
  sdk.platform.on(sdk.EVENT_NAME.AUDIO_STATE_CHANGED, value => {
    hostAudioEnabled = value;
  });
  updatePause();
}

// Prevent fresh input from queuing in the suspended engine. Allow releases
// to clear the browser's existing mouse/touch state without running gameplay.
for (const type of ['mousedown', 'mousemove', 'touchstart', 'touchmove']) {
  window.addEventListener(type, event => {
    if (paused && !event.target.closest?.('#development-controls')) {
      event.stopImmediatePropagation();
    }
  }, { capture: true });
}

function showDevelopmentControls() {
  const controls = document.createElement('div');
  controls.id = 'development-controls';
  const pause = document.createElement('button');
  const restart = document.createElement('button');
  pause.textContent = 'Pause';
  restart.textContent = 'Restart makeover';
  const setDeveloperPause = value => {
    developerPaused = value;
    pause.textContent = value ? 'Resume' : 'Pause';
    updatePause();
  };
  pause.addEventListener('click', () => setDeveloperPause(!developerPaused));
  restart.addEventListener('click', () => {
    if (window.confirm('Restart the makeover and discard current progress?')) {
      restartCount++;
      setDeveloperPause(false);
    }
  });
  controls.append(pause, restart);
  document.body.append(controls);
}

function initialize() {
  // The loading state must have painted before a host can ask for its first frame.
  initialized ??= new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    .then(() => sdk.initialize())
    .then(listenForLifecycle)
    .catch(error => {
      console.warn('Playgama Bridge initialization failed', error);
    });
  return initialized;
}

window.runwayPlatform = {
  initialize,

  stageReady(debug) {
    readiness ??= initialize().then(() => {
      document.getElementById('game-loading')?.remove();
      if (debug) showDevelopmentControls();
      stageStarted = true;
      if (paused) Module.pauseMainLoop();
      if (sdk?.isInitialized) {
        return sdk.platform.sendMessage(sdk.PLATFORM_MESSAGE.GAME_READY);
      }
    }).catch(error => {
      console.warn('Playgama Bridge could not report game readiness', error);
    });
  },

  resize(callback) {
    // A canvas backing-size change would erase the held frame.
    if (stageStarted && paused) pendingResize = callback;
    else callback();
  },

  state() {
    return {
      paused,
      audio_enabled: hostAudioEnabled && !paused,
      pause_count: pauseCount,
      restart_count: restartCount,
    };
  },

  async load(key) {
    await initialize();
    if (!sdk?.isInitialized) throw new Error('Playgama Bridge is unavailable');
    return sdk.storage.get(key);
  },

  async save(key, value) {
    await initialize();
    if (!sdk?.isInitialized) throw new Error('Playgama Bridge is unavailable');
    await sdk.storage.set(key, value);
  },
};
