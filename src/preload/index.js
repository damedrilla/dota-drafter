import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronWindow', {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizeChanged: (cb) => {
    const handler = (_, isMax) => cb(isMax);
    ipcRenderer.on('window-maximize-changed', handler);
    return () => ipcRenderer.removeListener('window-maximize-changed', handler);
  },
});

// Expose renderer API for settings, export and live window control
contextBridge.exposeInMainWorld('electronAPI', {
  saveSettings: (cfg) => ipcRenderer.invoke('save-settings', cfg),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  exportDraft: (payload) => ipcRenderer.invoke('export-draft', payload),
  openLiveWindow: (state) => ipcRenderer.invoke('open-live-window', state),
  updateLiveState: (state) => ipcRenderer.invoke('update-live-state', state),
  openLiveInBrowser: (state) => ipcRenderer.invoke('open-live-in-browser', state),
  onInitLive: (cb) => {
    const handler = (_, data) => cb(data);
    ipcRenderer.on('init-live-state', handler);
    return () => ipcRenderer.removeListener('init-live-state', handler);
  }
});