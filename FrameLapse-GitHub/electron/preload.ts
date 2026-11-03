import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('framelapse', {
  state: () => ipcRenderer.invoke('state'), displays: () => ipcRenderer.invoke('displays'), library: () => ipcRenderer.invoke('library'),
  action: (action: string, arg?: unknown) => ipcRenderer.invoke('action', action, arg),
  onRegion: (callback: (rect: unknown) => void) => {
    const fn = (_e: unknown, rect: unknown) => callback(rect); ipcRenderer.on('region-picked', fn);
    return () => ipcRenderer.removeListener('region-picked', fn);
  }
});
