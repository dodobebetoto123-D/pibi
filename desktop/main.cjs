const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron')
const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const syncFs = require('node:fs')
const { spawn } = require('node:child_process')
const installers = new Map()
let mainWindow
let trustedOrigin
function logError(error) {
  try { syncFs.appendFileSync(path.join(app.getPath('userData'), 'desktop-errors.log'), `${new Date().toISOString()} ${error.stack || error}\n`) } catch {}
}
process.on('uncaughtException', logError)
process.on('unhandledRejection', logError)
 
let frontendServer
const previewServers = new Map()

const PROJECTS_DIR = () => path.join(app.getPath('documents'), 'Pibi React Projects')
const ALLOWED_FILES = /^(index\.html|src\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:jsx|tsx|js|ts|css|json))$/

function safeProjectDir(projectId) {
  if (typeof projectId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(projectId)) {
    throw new Error('Invalid project id')
  }
  return path.join(PROJECTS_DIR(), projectId)
}

function initialProjectFiles() {
  return {
    'index.html': `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>My React PoC</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`,
    'src/main.jsx': `import React from 'react'\nimport { createRoot } from 'react-dom/client'\nimport App from './App.jsx'\nimport './index.css'\n\ncreateRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)\n`,
    'src/App.jsx': `export default function App() {\n  return (\n    <main className="app-shell">\n      <p className="eyebrow">PIBI · REACT POC</p>\n      <h1>Your idea starts here.</h1>\n      <p>Edit <code>src/App.jsx</code>, then save and run the preview.</p>\n      <button onClick={() => alert('Your React app is running locally.')}>Try an interaction</button>\n    </main>\n  )\n}\n`,
    'src/index.css': `:root { font-family: Inter, Pretendard, system-ui, sans-serif; color: #1b1c1f; background: #f7f8fb; font-synthesis: none; text-rendering: optimizeLegibility; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-width: 320px; min-height: 100vh; }\nbutton { font: inherit; cursor: pointer; }\n.app-shell { width: min(720px, calc(100% - 40px)); margin: 12vh auto; padding: 40px; background: #fff; border: 1px solid #e9eaef; border-radius: 20px; }\n.eyebrow { color: #4154ff; font-size: 12px; font-weight: 700; letter-spacing: .12em; }\nh1 { margin: 14px 0; font-size: clamp(30px, 6vw, 48px); letter-spacing: -.04em; }\np { color: #6e6f73; line-height: 1.6; }\ncode { color: #2432ad; background: #f5f6ff; padding: 2px 6px; border-radius: 6px; }\nbutton { margin-top: 20px; padding: 12px 18px; color: white; background: #4154ff; border: 0; border-radius: 12px; }\n`,
  }
}

async function ensureProject(projectId) {
  const root = safeProjectDir(projectId)
  await fs.mkdir(path.join(root, 'src'), { recursive: true })
  const starter = initialProjectFiles()
  for (const [relativePath, contents] of Object.entries(starter)) {
    const absolutePath = path.join(root, relativePath)
    try {
      await fs.access(absolutePath)
    } catch {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true })
      await fs.writeFile(absolutePath, contents, 'utf8')
    }
  }
  const manifestPath = path.join(root, 'package.json')
  try {
    await fs.access(manifestPath)
  } catch {
    await fs.writeFile(manifestPath, JSON.stringify({
      name: `pibi-poc-${projectId.slice(0, 8).toLowerCase()}`,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { react: '^19.1.0', 'react-dom': '^19.1.0' },
      devDependencies: { '@vitejs/plugin-react': '^4.4.1', vite: '^6.4.5' },
    }, null, 2) + '\n', 'utf8')
  }
  return root
}

async function listSourceFiles(root, relative = 'src') {
  const entries = await fs.readdir(path.join(root, relative), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const child = `${relative}/${entry.name}`
    if (entry.isDirectory()) files.push(...await listSourceFiles(root, child))
    else if (ALLOWED_FILES.test(child)) files.push(child)
  }
  return files
}

function getViteModulesPath(...segments) {
  return path.join(app.isPackaged ? `${app.getAppPath()}.unpacked` : app.getAppPath(), 'node_modules', ...segments)
}

async function viteOptions(root, port = 0) {
  const [{ build, createServer }, reactModule] = await Promise.all([
    import(pathToFileURL(getViteModulesPath('vite', 'dist', 'node', 'index.js')).href),
    import(pathToFileURL(getViteModulesPath('@vitejs', 'plugin-react', 'dist', 'index.js')).href),
  ])
  return {
    build,
    createServer,
    options: {
      configFile: false,
      root,
      plugins: [reactModule.default()],
      resolve: {
        alias: [
          { find: 'react-dom', replacement: syncFs.existsSync(path.join(root, 'node_modules/react-dom')) ? path.join(root, 'node_modules/react-dom') : getViteModulesPath('react-dom') },
          { find: 'react', replacement: syncFs.existsSync(path.join(root, 'node_modules/react')) ? path.join(root, 'node_modules/react') : getViteModulesPath('react') },
        ],
      },
      optimizeDeps: { include: ['react', 'react-dom/client'] },
      server: {
        host: 'localhost',
        port,
        strictPort: false,
        open: false,
        fs: { allow: [root, app.getAppPath()] },
      },
      build: { outDir: 'dist', emptyOutDir: true },
    },
  }
}

async function getProjectFiles(projectId) {
  const root = await ensureProject(projectId)
  const files = ['index.html', ...await listSourceFiles(root)]
  const result = {}
  for (const relativePath of files) result[relativePath] = await fs.readFile(path.join(root, relativePath), 'utf8')
  return { files: result }
}

async function saveProjectFiles(projectId, files) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Invalid files')
  const entries = Object.entries(files)
  if (entries.length > 100) throw new Error('A PoC project can contain up to 100 editable files')
  const totalBytes = entries.reduce((sum, [, content]) => sum + (typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : 0), 0)
  if (totalBytes > 2_000_000) throw new Error('PoC source files are limited to 2 MB per save')
  const root = await ensureProject(projectId)
  for (const [relativePath, content] of entries) {
    if (!ALLOWED_FILES.test(relativePath) || typeof content !== 'string') throw new Error(`Unsupported source file: ${relativePath}`)
    const absolutePath = path.resolve(root, relativePath)
    if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error('Invalid source path')
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, content, 'utf8')
  }
  return { saved: entries.length }
}

async function startPreview(projectId) {
  const root = await ensureProject(projectId)
  const existing = previewServers.get(projectId)
  if (existing) return { url: existing.url }
  const { createServer, options } = await viteOptions(root)
  const server = await createServer(options)
  await server.listen()
  const url = server.resolvedUrls?.local?.[0] || `http://localhost:${server.config.server.port}/`
  previewServers.set(projectId, { server, url })
  return { url }
}

async function buildProject(projectId) {
  const root = await ensureProject(projectId)
  const { build, options } = await viteOptions(root)
  await build({ ...options, configFile: false, server: undefined })
  return { outputPath: path.join(root, 'dist') }
}

async function openProjectFolder(projectId) {
  const root = await ensureProject(projectId)
  const error = await shell.openPath(root)
  if (error) throw new Error(error)
  return { path: root }
}

async function serveFrontend() {
  const root = path.join(app.getAppPath(), 'frontend', 'dist')
  const mime = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
    '.ttf': 'font/ttf', '.woff2': 'font/woff2',
  }
  const server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    let filePath = path.resolve(root, relativePath)
    if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, 'index.html')) filePath = path.join(root, 'index.html')
    try {
      const content = await fs.readFile(filePath)
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
      res.end(content)
    } catch {
      const index = await fs.readFile(path.join(root, 'index.html'))
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' })
      res.end(index)
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(41785, 'localhost', resolve)
  })
  frontendServer = server
  const address = server.address()
  return `http://localhost:${address.port}/`
}

function registerIpc() {
  const originalHandle = ipcMain.handle.bind(ipcMain)
  const handle = (channel, listener) => originalHandle(channel, (event, ...args) => {
    if (event.sender !== mainWindow?.webContents || event.senderFrame !== mainWindow.webContents.mainFrame || new URL(event.senderFrame.url).origin !== trustedOrigin) {
      throw new Error('Untrusted desktop request')
    }
    return listener(event, ...args)
  })
  handle('pibi:poc:install', async (_event, projectId, packageName) => {
    if (typeof packageName !== 'string' || !/^(?:@[a-z0-9_-]+\/)?[a-z0-9][a-z0-9._-]*(?:@[a-zA-Z0-9.^~_-]+)?$/.test(packageName) || packageName.length > 180) throw new Error('Enter a registry package name, for example lucide-react or lodash@4.17.21')
    const root = await ensureProject(projectId)
    if (installers.has(projectId)) throw new Error('Package installation is already running')
    const preview = previewServers.get(projectId)
    if (preview) { await preview.server.close(); previewServers.delete(projectId) }
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [getViteModulesPath('npm', 'bin', 'npm-cli.js'), 'install', '--ignore-scripts', '--no-audit', '--no-fund', '--save', '--', packageName], {
        cwd: root, windowsHide: true, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
      })
      installers.set(projectId, child)
      let output = ''
      const append = data => { output = (output + data.toString()).slice(-20000) }
      child.stdout.on('data', append); child.stderr.on('data', append)
      const timer = setTimeout(() => { child.kill(); reject(new Error('Package installation timed out. Please check your connection.')) }, 300000)
      child.once('error', error => { clearTimeout(timer); installers.delete(projectId); reject(error) })
      child.once('close', code => {
        clearTimeout(timer); installers.delete(projectId)
        if (code !== 0) reject(new Error(output || `npm exited with code ${code}`))
        else resolve({ output })
      })
    })
  })
  handle('pibi:poc:load', (_event, projectId) => getProjectFiles(projectId))
  handle('pibi:poc:save', (_event, projectId, files) => saveProjectFiles(projectId, files))
  handle('pibi:poc:preview', (_event, projectId) => startPreview(projectId))
  handle('pibi:poc:stop-preview', async (_event, projectId) => {
    safeProjectDir(projectId)
    const preview = previewServers.get(projectId)
    if (preview) { await preview.server.close(); previewServers.delete(projectId) }
  })
  handle('pibi:poc:build', (_event, projectId) => buildProject(projectId))
  handle('pibi:poc:open-folder', (_event, projectId) => openProjectFolder(projectId))
  handle('pibi:poc:new-file', async (_event, projectId, relativePath) => {
    if (!ALLOWED_FILES.test(relativePath) || relativePath === 'index.html' || relativePath === 'src/main.jsx' || relativePath === 'src/index.css') {
      throw new Error('Use a source file path such as src/components/Header.jsx')
    }
    const root = await ensureProject(projectId)
    const filePath = path.resolve(root, relativePath)
    if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error('Invalid source path')
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    try { await fs.access(filePath); throw new Error('That file already exists') } catch (error) {
      if (error.message === 'That file already exists') throw error
    }
    const extension = path.extname(filePath)
    const content = extension === '.css' ? '/* Styles */\n' : extension === '.json' ? '{}\n' : /\.[jt]sx$/.test(filePath) ? 'export default function Component() {\n  return <div>New component</div>\n}\n' : 'export {}\n'
    await fs.writeFile(filePath, content, { encoding: 'utf8', flag: 'wx' })
    return { path: relativePath }
  })
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#ffffff',
    title: 'pibi',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = win
  win.webContents.on('render-process-gone', (_event, details) => logError(new Error(JSON.stringify(details))))
  win.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== trustedOrigin) event.preventDefault()
  })
  win.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url)
    if (url === 'about:blank' || target.protocol === 'https:') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      }
    }
    if (target.protocol === 'http:' || target.protocol === 'mailto:') void shell.openExternal(url)
    return { action: 'deny' }
  })

  const url = app.isPackaged ? await serveFrontend() : process.env.PIBI_DEV_SERVER_URL || 'http://localhost:5173'
  trustedOrigin = new URL(url).origin
  await win.loadURL(url)
}

app.on('second-instance', () => {
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
})

if (!app.requestSingleInstanceLock()) app.quit()
else app.whenReady().then(async () => {
  registerIpc()
  await createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow() })
}).catch((error) => {
  logError(error)
  dialog.showErrorBox('pibi 시작 오류', `${error.message}\n로그: ${path.join(app.getPath('userData'), 'desktop-errors.log')}`)
  app.quit()
})

app.on('before-quit', () => {
  for (const child of installers.values()) child.kill()
  if (frontendServer) frontendServer.close()
  for (const { server } of previewServers.values()) void server.close()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

