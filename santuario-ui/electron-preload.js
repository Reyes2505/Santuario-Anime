// Preload script — keep minimal and safe.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('santuario', {
  platform: process.platform,
});
