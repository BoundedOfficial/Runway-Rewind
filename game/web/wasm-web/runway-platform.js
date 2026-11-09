'use strict';

const sdk = window.bridge;
let initialized;
let readiness;

function initialize() {
  // The loading state must have painted before a host can ask for its first frame.
  initialized ??= new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    .then(() => sdk.initialize())
    .catch(error => {
      console.warn('Playgama Bridge initialization failed', error);
    });
  return initialized;
}

window.runwayPlatform = {
  initialize,

  stageReady() {
    document.getElementById('game-loading')?.remove();
    readiness ??= initialize().then(() => {
      if (sdk?.isInitialized) {
        return sdk.platform.sendMessage(sdk.PLATFORM_MESSAGE.GAME_READY);
      }
    }).catch(error => {
      console.warn('Playgama Bridge could not report game readiness', error);
    });
  },

  state() {
    if (!sdk?.isInitialized) {
      return { paused: false, audio_enabled: false };
    }
    return { paused: sdk.platform.isPaused, audio_enabled: sdk.platform.isAudioEnabled };
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
