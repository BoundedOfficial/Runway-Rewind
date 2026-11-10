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
let activeWaiters = [];
const INITIAL_LOAD_LIMIT_MS = 1500;
const STORAGE_RETRY_MS = 2000;
const runs = new Map();
let activeLevel = 'level-1';
function driveStorage() { for (const run of runs.values()) run.drive(); }

function updatePause() {
  const next = hostPaused || developerPaused;
  if (paused === next) return;
  paused = next;
  if (paused) pauseCount++;
  else {
    const waiters = activeWaiters;
    activeWaiters = [];
    waiters.forEach(resume => resume());
    driveStorage();
  }
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

function whenActive() {
  return paused ? new Promise(resolve => activeWaiters.push(resolve)) : Promise.resolve();
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

function createRun(level, treatmentCount) {
  const runKey = 'runway-rewind.' + level;
  let initialRun = { ready: false }, initialRunTaken = false;
  let savedBoundary, pendingRun, storageRetry;
  let storageBusy = false, storageBlocked = false;
async function loadRun() {
  if (!sdk?.isInitialized) throw new Error('Playgama Bridge is unavailable');
  return standaloneStorage() ? window.localStorage.getItem(runKey) : sdk.storage.get(runKey, false);
}

async function storeRun(completedTreatments) {
  const value = JSON.stringify({
    version: 1,
    level,
    completedTreatments,
    completed: completedTreatments === treatmentCount,
  });
  if (standaloneStorage()) window.localStorage.setItem(runKey, value);
  else await sdk.storage.set(runKey, value);
}

function parseRun(value) {
  if (value === null) return null;
  const run = JSON.parse(value);
  if (run?.version !== 1 || run.level !== level || !Number.isInteger(run.completedTreatments)
      || run.completedTreatments < 0 || run.completedTreatments > treatmentCount
      || run.completed !== (run.completedTreatments === treatmentCount)) {
    throw new Error('Unsupported saved makeover');
  }
  return run.completedTreatments;
}

function allowUnsavedStart() {
  if (!initialRun.ready) initialRun = { ready: true };
}

async function driveRunStorage() {
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
      driveRunStorage();
    }, STORAGE_RETRY_MS);
  } finally {
    storageBusy = false;
    driveRunStorage();
  }
}

  setTimeout(allowUnsavedStart, INITIAL_LOAD_LIMIT_MS);
  return {
    drive: driveRunStorage,
    enter() {
      if (pendingRun || savedBoundary !== undefined) initialRun = { ready: true, boundary: pendingRun?.boundary ?? savedBoundary };
      driveRunStorage();
    },
    initial() { if (initialRun.ready) initialRunTaken = true; return initialRun; },
    save(boundary) {
      if (!Number.isInteger(boundary) || boundary < 0 || boundary > treatmentCount) return;
      pendingRun = { boundary, reset: boundary === 0 || pendingRun?.reset === true };
      driveRunStorage();
    },
  };
}

window.runwayPlatform = {
  initialize,
  whenActive,

  stageReady(debug) {
    readiness ??= initialize().then(() => {
      stageStarted = true;
      if (paused) Module.pauseMainLoop();
      return whenActive();
    }).then(() => {
      document.getElementById('game-loading')?.remove();
      if (debug) window.mountRunwayDevelopmentControls?.(value => {
        developerPaused = value;
        updatePause();
      }, () => { restartCount++; });
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

  prepareRun(count, level = 'level-1') {
    if (!['level-1', 'level-2'].includes(level)) throw new Error('Unknown level');
    activeLevel = level;
    if (!runs.has(level)) runs.set(level, createRun(level, count));
    runs.get(level).enter();
  },

  initialRun() { return runs.get(activeLevel)?.initial() ?? { ready: true }; },

  saveRun(boundary, level = activeLevel) { runs.get(level)?.save(boundary); },
};
