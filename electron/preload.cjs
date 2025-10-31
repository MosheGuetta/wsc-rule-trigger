const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectCsv: () => ipcRenderer.invoke('select-csv'),
  startRun: (args) => ipcRenderer.invoke('start-run', args),
  openLogsFolder: () => ipcRenderer.invoke('open-logs-folder'), // ✅ new
  onLog: (cb) => ipcRenderer.on('run-log', (_e, msg) => cb(msg)),
  onProgress: (cb) => ipcRenderer.on('run-progress', (_e, payload) => cb(payload)),
  onComplete: (cb) => ipcRenderer.on('run-complete', (_e, payload) => cb(payload))
})
