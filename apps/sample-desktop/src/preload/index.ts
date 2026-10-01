import { contextBridge, ipcRenderer } from 'electron';

const api = {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getPlatform: (): Promise<{ platform: string; arch: string; version: string }> =>
    ipcRenderer.invoke('app:platform'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
