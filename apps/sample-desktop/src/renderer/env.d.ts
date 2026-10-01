/// <reference types="vite/client" />

interface ElectronAPI {
  getVersion(): Promise<string>;
  getPlatform(): Promise<{ platform: string; arch: string; version: string }>;
}

interface Window {
  electronAPI: ElectronAPI;
}
