const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pibiDesktop', {
  installPackage: (projectId, packageName) => ipcRenderer.invoke('pibi:poc:install', projectId, packageName),
  getProjectFiles: (projectId) => ipcRenderer.invoke('pibi:poc:load', projectId),
  saveProjectFiles: (projectId, files) => ipcRenderer.invoke('pibi:poc:save', projectId, files),
  startPreview: (projectId) => ipcRenderer.invoke('pibi:poc:preview', projectId),
  stopPreview: (projectId) => ipcRenderer.invoke('pibi:poc:stop-preview', projectId),
  buildProject: (projectId) => ipcRenderer.invoke('pibi:poc:build', projectId),
  openProjectFolder: (projectId) => ipcRenderer.invoke('pibi:poc:open-folder', projectId),
  createProjectFile: (projectId, relativePath) => ipcRenderer.invoke('pibi:poc:new-file', projectId, relativePath),
})
