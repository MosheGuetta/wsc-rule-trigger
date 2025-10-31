import React, { useEffect, useRef, useState } from 'react'
import { prettyNow } from './utils/format.js'

export default function App() {
  const [csvPath, setCsvPath] = useState('')
  const [cookie, setCookie] = useState('')
  const [batchSize, setBatchSize] = useState(100)
  const [pauseSeconds, setPauseSeconds] = useState(5)
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0, success: 0, failed: 0 })
  const logRef = useRef(null)
  const [logLines, setLogLines] = useState([])

  function pushLog(line) {
    setLogLines(prev => [...prev, `${prettyNow()} ${line}`])
  }

  useEffect(() => {
    window.api.onLog(msg => pushLog(msg))
    window.api.onProgress(p => setProgress(p))
    window.api.onComplete(payload => {
      setRunning(false)
      if (payload?.error) {
        pushLog(`[DONE with ERROR] ${payload.error}`)
      } else {
        pushLog(`[DONE] Total=${payload.total}, Success=${payload.success}, Failed=${payload.failed}`)
        pushLog(`Log saved under app data: ${payload.logName}`)
        if (payload.csvLogName) pushLog(`CSV saved under app data: ${payload.csvLogName}`) // ✅ new line
      }
    })
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logLines])

  const chooseCsv = async () => {
    const fp = await window.api.selectCsv()
    if (fp) setCsvPath(fp)
  }

  const start = async () => {
    if (!csvPath) return alert('Please choose a CSV file.')
    if (!cookie.trim()) return alert('Please paste the _BEAMER cookie.')
    if (batchSize <= 0) return alert('Batch size must be > 0')
    if (pauseSeconds < 0 || delaySeconds < 0) return alert('Pause and delay seconds cannot be negative')

    setRunning(true)
    setProgress({ done: 0, total: 0, success: 0, failed: 0 })
    setLogLines([])

    await window.api.startRun({
      csvPath,
      cookie,
      batchSize: Number(batchSize),
      pauseSeconds: Number(pauseSeconds),
      delaySeconds: Number(delaySeconds)
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">WSC Rule Trigger</h1>

        <div className="space-y-4 bg-white rounded-2xl shadow p-4">
          <div className="flex items-center gap-2">
            <button
              onClick={chooseCsv}
              disabled={running}
              className="px-3 py-2 rounded-xl shadow bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              📂 Choose CSV
            </button>
            <span className="text-sm truncate">{csvPath || 'No file selected'}</span>
          </div>

          <div>
            <label className="block text-sm font-medium">Cookie (_BEAMER)</label>
            <input
              type="text"
              value={cookie}
              onChange={e => setCookie(e.target.value)}
              className="mt-1 w-full rounded-xl border p-2"
              placeholder="Paste the full _BEAMER cookie string"
              disabled={running}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium">Batch Size</label>
              <input
                type="number"
                min={1}
                value={batchSize}
                onChange={e => setBatchSize(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2"
                disabled={running}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Pause Between Batches (sec)</label>
              <input
                type="number"
                min={0}
                value={pauseSeconds}
                onChange={e => setPauseSeconds(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2"
                disabled={running}
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Delay per Request (sec)</label>
              <input
                type="number"
                min={0}
                value={delaySeconds}
                onChange={e => setDelaySeconds(e.target.value)}
                className="mt-1 w-full rounded-xl border p-2"
                disabled={running}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={start}
              disabled={running}
              className="px-4 py-2 rounded-xl shadow bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ▶ Run
            </button>
            <div className="text-sm text-gray-700">
              <b>{progress.done}</b>/<b>{progress.total}</b> processed · ✅ {progress.success} · ❌ {progress.failed}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Log Output</label>
          <div
            ref={logRef}
            className="h-64 overflow-auto bg-black text-green-200 rounded-xl p-3 text-sm whitespace-pre-wrap"
          >
            {logLines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => window.api.openLogsFolder()}
              className="px-3 py-2 rounded-xl shadow bg-blue-600 text-white hover:bg-blue-700"
            >
              📁 Open Logs Folder
            </button>
          </div>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Expected CSV headers: <code>system,ruleid,gameid</code>
        </div>
      </div>
    </div>
  )
}