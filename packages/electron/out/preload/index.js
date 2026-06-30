"use strict";
const electron = require("electron");
const api = {
  server: () => electron.ipcRenderer.invoke("server:get"),
  onServerUpdated(callback) {
    const listener = (_event, state) => callback(state);
    electron.ipcRenderer.on("server:updated", listener);
    return () => electron.ipcRenderer.removeListener("server:updated", listener);
  }
};
electron.contextBridge.exposeInMainWorld("customOpenCode", api);
