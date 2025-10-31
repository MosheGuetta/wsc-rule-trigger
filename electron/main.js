import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import axios from 'axios'
import { parseCsvFile } from './parseCsvFile.js'

const isDev = !!process.env.VITE_DEV
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist', 'index.html')
    mainWindow.loadFile(indexPath)
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function ensureLogDir() {
  const base = app.getPath('userData')
  const logDir = path.join(base, 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  return logDir
}

function logToFile(filename, line) {
  const logDir = ensureLogDir()
  const fp = path.join(logDir, filename)
  fs.appendFileSync(fp, line + '\n', 'utf-8')
}

ipcMain.handle('open-logs-folder', async () => {
  const logDir = ensureLogDir()
  await shell.openPath(logDir)
})

ipcMain.handle('select-csv', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose CSV file',
    filters: [{ name: 'CSV', extensions: ['csv'] }],
    properties: ['openFile']
  })
  if (canceled || !filePaths?.[0]) return null
  return filePaths[0]
})

// === MAIN RUN HANDLER ===
ipcMain.handle('start-run', async (_event, { csvPath, cookie, batchSize, pauseSeconds, delaySeconds }) => {
  const rows = await parseCsvFile(csvPath)
  const total = rows.length
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logName = `trigger-log-${timestamp}.txt`
  const csvLogName = `trigger-log-${timestamp}.csv`
  logToFile(csvLogName, 'gameid,ruleid,system,status') // ✅ CSV header

  let success = 0
  let failed = 0
  let done = 0

  const client = axios.create({
    baseURL: 'https://prod-eus2.clipro.tv',
    headers: { Cookie: `_BEAMER=${cookie}` },
    timeout: 10000
  })

  function sendLog(msg) {
    mainWindow?.webContents.send('run-log', msg)
    logToFile(logName, msg)
  }

  sendLog(`Loaded ${total} rows. Running in ${Math.ceil(total / batchSize)} batch(es). Pause: ${pauseSeconds}s.`)

  for (let i = 0; i < total; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    sendLog(`\n— Batch ${i / batchSize + 1}/${Math.ceil(total / batchSize)} (${batch.length} items) —`)
    for (const item of batch) {
      try {
        const body = { system: item.system, ruleId: item.ruleid, gameId: item.gameid }
        const res = await client.post('/api/mcservicecore/rules-manager/trigger', body)
        success++
        sendLog(`[OK] system=${item.system} gameId=${item.gameid} ruleId=${item.ruleid} → ${res.status}`)
        logToFile(csvLogName, `${item.gameid},${item.ruleid},${item.system},success`)
      } catch (err) {
        failed++
        const status = err?.response?.status ?? 'ERR'
        sendLog(`[FAIL] system=${item.system} gameId=${item.gameid} ruleId=${item.ruleid} → ${status}`)
        logToFile(csvLogName, `${item.gameid},${item.ruleid},${item.system},failed`)
      }

      done++
      mainWindow?.webContents.send('run-progress', { done, total, success, failed })
      await new Promise(res => setTimeout(res, delaySeconds * 1000))
    }

    if (i + batchSize < total) {
      await new Promise(res => setTimeout(res, pauseSeconds * 1000))
    }
  }

  sendLog(`\nCompleted. Total=${total}, Success=${success}, Failed=${failed}.`)
  mainWindow?.webContents.send('run-complete', { total, success, failed, logName, csvLogName })
  return { ok: true, total, success, failed, logFile: logName, csvFile: csvLogName }
})