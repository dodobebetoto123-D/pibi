const { spawn } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs/promises')
const assert = require('node:assert/strict')

async function main() {
  const id = `pibi-smoke-${Date.now()}`
  const port = 9237
  const child = spawn(path.join(__dirname, 'release/win-unpacked/pibi.exe'), [`--remote-debugging-port=${port}`], { stdio: 'ignore', windowsHide: true })
  let ws, projectRoot
  try {
    let target
    for (let i = 0; i < 60; i++) {
      try { target = (await (await fetch(`http://localhost:${port}/json`)).json()).find(t => t.type === 'page' && t.url.startsWith('http://localhost:')) } catch {}
      if (target) break
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    assert(target, 'Packaged app did not expose its loaded page')
    ws = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
    let seq = 0
    const pending = new Map()
    ws.onmessage = ({ data }) => {
      const value = JSON.parse(data)
      if (pending.has(value.id)) { pending.get(value.id)(value); pending.delete(value.id) }
    }
    const evaluate = async expression => {
      const number = ++seq
      const result = new Promise(resolve => pending.set(number, resolve))
      ws.send(JSON.stringify({ id: number, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
      const response = await Promise.race([result, new Promise((_, reject) => setTimeout(() => reject(new Error('Desktop operation timed out')), 90000).unref())])
      if (response.error || response.result.exceptionDetails) throw new Error(JSON.stringify(response))
      return response.result.result.value
    }
    const result = await evaluate(`(async () => {
      const api = window.pibiDesktop, id = ${JSON.stringify(id)};
      const initial = await api.getProjectFiles(id);
      await api.createProjectFile(id, 'src/sample.css');
      await api.createProjectFile(id, 'src/sample.json');
      const loaded = await api.getProjectFiles(id);
      JSON.parse(loaded.files['src/sample.json']);
      await api.installPackage(id, 'clsx@2.1.1');
      loaded.files['src/App.jsx'] = 'import clsx from "clsx"; export default function App() { return <h1 className={clsx("ok")}>PIBI_SMOKE_SUCCESS</h1> }';
      await api.saveProjectFiles(id, loaded.files);
      const saved = await api.getProjectFiles(id);
      const preview = await api.startPreview(id);
      const built = await api.buildProject(id);
      let invalidRejected = false;
      try { await api.saveProjectFiles(id, { '../escape.js': 'bad' }) } catch { invalidRejected = true }
      return { title: document.title, files: Object.keys(initial.files), saved: saved.files['src/App.jsx'], preview: preview.url, outputPath: built.outputPath, invalidRejected };
    })()`)
    projectRoot = path.dirname(result.outputPath)
    assert.equal(result.title, 'pibi')
    assert(result.saved.includes('PIBI_SMOKE_SUCCESS'))
    assert(result.invalidRejected)
    const preview = await fetch(result.preview)
    assert.equal(preview.status, 200)
    const transformed = await fetch(new URL('src/App.jsx', result.preview))
    const source = await transformed.text()
    assert.equal(transformed.status, 200, source)
    assert(source.includes('PIBI_SMOKE_SUCCESS'))
    await fs.access(path.join(result.outputPath, 'index.html'))
    await evaluate(`window.pibiDesktop.stopPreview(${JSON.stringify(id)})`)
    await assert.rejects(fetch(result.preview))
    console.log(JSON.stringify({ status: 'passed', checks: ['app startup', 'preload IPC', 'source save/reload', 'CSS and JSON file creation', 'npm package installation and import', 'Vite preview JSX transform', 'preview stop', 'production build', 'path traversal rejection'] }, null, 2))
  } finally {
    ws?.close()
    child.kill()
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (projectRoot && path.basename(projectRoot) === id && path.basename(path.dirname(projectRoot)) === 'Pibi React Projects') await fs.rm(projectRoot, { recursive: true, force: true })
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
