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
const RUN_KEY = 'runway-rewind.level-1';
const INITIAL_LOAD_LIMIT_MS = 1500;
const STORAGE_RETRY_MS = 2000;

let treatmentCount;
let initialRun = { ready: false };
let initialRunTaken = false;
let savedBoundary; // undefined while unknown, null after a confirmed empty read
let pendingRun;
let storageBusy = false;
let storageBlocked = false;
let storageRetry;

function updatePause() {
  const next = hostPaused || developerPaused;
  if (paused === next) return;
  paused = next;
  if (paused) pauseCount++;
  else driveStorage();
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

function standaloneStorage() {
  return sdk.platform.id === 'mock' || sdk.platform.id === 'standalone';
}

async function loadRun() {
  if (!sdk?.isInitialized) throw new Error('Playgama Bridge is unavailable');
  return standaloneStorage() ? window.localStorage.getItem(RUN_KEY) : sdk.storage.get(RUN_KEY, false);
}

async function storeRun(completedTreatments) {
  const value = JSON.stringify({
    version: 1,
    level: 'level-1',
    completedTreatments,
    completed: completedTreatments === treatmentCount,
  });
  if (standaloneStorage()) window.localStorage.setItem(RUN_KEY, value);
  else await sdk.storage.set(RUN_KEY, value);
}

function parseRun(value) {
  if (value === null) return null;
  const run = JSON.parse(value);
  if (run?.version !== 1 || run.level !== 'level-1' || !Number.isInteger(run.completedTreatments)
      || run.completedTreatments < 0 || run.completedTreatments > treatmentCount
      || run.completed !== (run.completedTreatments === treatmentCount)) {
    throw new Error('Unsupported saved makeover');
  }
  return run.completedTreatments;
}

function allowUnsavedStart() {
  if (!initialRun.ready) initialRun = { ready: true };
}

async function driveStorage() {
  if (treatmentCount === undefined || paused || storageBusy || storageBlocked || storageRetry) return;
  const loading = savedBoundary === undefined;
  if (!loading && (!pendingRun || (!pendingRun.reset && savedBoundary !== null
      && pendingRun.boundary <= savedBoundary))) return;

  storageBusy = true;
  try {
    if (loading) {
      const value = await loadRun();
      try {
        savedBoundary = parseRun(value);
      } catch (error) {
        storageBlocked = true;
        allowUnsavedStart();
        console.warn('Keeping an unsupported saved makeover', error);
        return;
      }
      // Only the initial handoff may change the stage. A later read can safely
      // authorize writes, but must preserve the active run and higher saved progress.
      if (!initialRunTaken) initialRun = { ready: true, boundary: savedBoundary };
    } else {
      const write = pendingRun;
      await storeRun(write.boundary);
      savedBoundary = write.boundary;
      if (pendingRun === write) pendingRun = undefined;
    }
  } catch (error) {
    allowUnsavedStart();
    console.warn(loading ? 'Could not restore the saved makeover' : 'Could not save the makeover', error);
    storageRetry = setTimeout(() => {
      storageRetry = undefined;
      driveStorage();
    }, STORAGE_RETRY_MS);
  } finally {
    storageBusy = false;
    driveStorage();
  }
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

  prepareRun(count) {
    treatmentCount = count;
    setTimeout(allowUnsavedStart, INITIAL_LOAD_LIMIT_MS);
    driveStorage();
  },

  initialRun() {
    if (initialRun.ready) initialRunTaken = true;
    return initialRun;
  },

  saveRun(boundary) {
    // Retain the newest milestone while a read or write is in flight. A reset
    // authorizes lower progress once the existing record is known.
    pendingRun = { boundary, reset: boundary === 0 || pendingRun?.reset === true };
    driveStorage();
  },
};
