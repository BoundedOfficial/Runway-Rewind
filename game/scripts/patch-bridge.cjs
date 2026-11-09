// SPDX-License-Identifier: LGPL-3.0-or-later
// Runway Rewind compatibility edits for the published Playgama Bridge 2.4.1 bundle.
'use strict';

const { createHash } = require('node:crypto');
const fs = require('node:fs');

const [, , input, output] = process.argv;
if (!input || !output) throw new Error('Pass the upstream Bridge 2.4.1 file and the patched output path');
const bytes = fs.readFileSync(input);
const upstreamHash = 'ddf7d8274a86ab2a861ceab89e1b5cbe5afc29b6ea4dceda57a576ac6a8c3822';
if (createHash('sha256').update(bytes).digest('hex') !== upstreamHash) {
  throw new Error('The Bridge patch requires the pinned upstream 2.4.1 release');
}
let source = bytes.toString('utf8');

function replaceOnce(original, replacement) {
  const position = source.indexOf(original);
  if (position === -1 || source.indexOf(original, position + original.length) !== -1) {
    throw new Error(`Expected exactly one Bridge patch anchor: ${original}`);
  }
  source = source.replace(original, () => replacement);
}

// YouTube host callbacks exclusively own pause/resume and audio state.
const youtubeId = 'get platformId(){return o.Lb.YOUTUBE}';
replaceOnce(youtubeId, youtubeId + 'get isPlatformPageVisibilityApiAllowed(){return false}');
replaceOnce('document.addEventListener("visibilitychange",(()=>{document.visibilityState===o.YU.VISIBLE&&this.#rn()})),window.addEventListener("pageshow",(()=>{this.#rn()})),', '');

// Keep release storage cloud-only. The upstream fallback can turn a failed read
// into an empty/local record, migrate local data on read, or hide a failed write.
replaceOnce('class u extends i.Z{#wt=new h;#Tt=new c;', `class u extends i.Z{#wt=new h;#Tt=new c;
  #usesReleaseCloud() {
    const platform = this._platformBridge.platformId;
    return platform === "youtube" || platform === "playgama";
  }
  #requireActiveCloud() {
    if (!this.#Lt()) throw new n.Hd(n.Bq.STORAGE_NOT_SUPPORTED);
    if (this._platformBridge.isPlatformPaused) throw new Error("Cloud save paused");
  }
  async #readReleaseCloud(keys, parse) {
    this.#requireActiveCloud();
    const state = await this._platformBridge.getDataFromStorage(keys);
    return keys.map(key => {
      const value = Object.hasOwn(state, key) ? state[key] : null;
      if (value !== null && typeof value !== "string") throw new Error("Invalid cloud save value");
      return parse ? d(value, true) : value;
    });
  }
`);
replaceOnce('this._platformBridge.on(n.W1.PLATFORM_STORAGE_AVAILABILITY_CHANGED,', 'this.#usesReleaseCloud()||this._platformBridge.on(n.W1.PLATFORM_STORAGE_AVAILABILITY_CHANGED,');
replaceOnce('async#Rt(e,t){', 'async#Rt(e,t){if(this.#usesReleaseCloud())return this.#readReleaseCloud(e,t);');
replaceOnce('async#bt(e){', `async#bt(e){
    if (this.#usesReleaseCloud()) {
      this.#requireActiveCloud();
      if (e.sets.length) await this._platformBridge.setDataToStorage(this.#Gt(e.sets));
      if (e.deletes.length) await this.#Ot(e.deletes);
      return;
    }
`);
replaceOnce('async#Ot(e){', `async#Ot(e){
    if (this.#usesReleaseCloud()) {
      this.#requireActiveCloud();
      return this._platformBridge.deleteDataFromStorage(e);
    }
`);

// Validate the cloud envelope on reads and on the read side of a write.
// YouTube documents a string return. The empty string is the no-save value.
const requireRecord = `if (!state || Object.getPrototypeOf(state) !== Object.prototype) {
        throw new Error("Invalid cloud save record");
      }`;
replaceOnce('getDataFromStorage(){return this._platformSdk.game.loadData().then((e=>{if("string"==typeof e&&""!==e)try{return JSON.parse(e)}catch{return{}}return{}}))}', `
  async getDataFromStorage() {
    const value = await this._platformSdk.game.loadData();
    if (typeof value !== "string") throw new Error("Invalid YouTube save response");
    const state = value === "" ? {} : JSON.parse(value);
    ${requireRecord}
    return state;
  }`);
replaceOnce('async getDataFromStorage(){return await this.#ar(),this._platformSdk.cloudSaveApi.getState()}', `
  async getDataFromStorage() {
    await this.#ar();
    const state = await this._platformSdk.cloudSaveApi.getState();
    ${requireRecord}
    return state;
  }`);

// A host pause can arrive during the SDK's read-modify-write operation.
const pauseGuard = 'if(this.isPlatformPaused)throw new Error("Cloud save paused");';
const youtubeWrite = 'await this._platformSdk.game.saveData(JSON.stringify(t))';
replaceOnce(`Object.keys(e).forEach((r=>{t[r]=e[r]})),${youtubeWrite}`, `Object.keys(e).forEach((r=>{t[r]=e[r]}));${pauseGuard}${youtubeWrite}`);
replaceOnce(`e.forEach((e=>{delete t[e]})),${youtubeWrite}`, `e.forEach((e=>{delete t[e]}));${pauseGuard}${youtubeWrite}`);
const playgamaRead = 'await this.#ar();const t=await this._platformSdk.cloudSaveApi.getState();';
const playgamaWrite = 'await this._platformSdk.cloudSaveApi.setItems(t)';
replaceOnce(`${playgamaRead}Object.keys(e).forEach((r=>{t[r]=e[r]})),${playgamaWrite}`, `const t=await this.getDataFromStorage();Object.keys(e).forEach((r=>{t[r]=e[r]}));${pauseGuard}${playgamaWrite}`);
replaceOnce(`${playgamaRead}e.forEach((e=>{delete t[e]})),${playgamaWrite}`, `const t=await this.getDataFromStorage();e.forEach((e=>{delete t[e]}));${pauseGuard}${playgamaWrite}`);

// The Playgama adapter otherwise overrides sendAnalyticsEvents:false.
replaceOnce('this._platformBridge.platformId===n.Lb.PLAYGAMA||!1!==c.ZP.getValues().sendAnalyticsEvents', '!1!==c.ZP.getValues().sendAnalyticsEvents');

fs.writeFileSync(output, '/*! Playgama Bridge 2.4.1, modified by Runway Rewind on 2026-11-09. See licenses/Playgama-Bridge-NOTICE.txt. */\n' + source);
