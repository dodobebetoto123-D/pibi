/// <reference types="vite/client" />

interface PibiDesktopApi {
  installPackage: (projectId: string, packageName: string) => Promise<{ output: string }>
  getProjectFiles: (projectId: string) => Promise<{ files: Record<string, string> }>
  saveProjectFiles: (projectId: string, files: Record<string, string>) => Promise<{ saved: number }>
  startPreview: (projectId: string) => Promise<{ url: string }>
  stopPreview: (projectId: string) => Promise<void>
  buildProject: (projectId: string) => Promise<{ outputPath: string }>
  openProjectFolder: (projectId: string) => Promise<{ path: string }>
  createProjectFile: (projectId: string, relativePath: string) => Promise<{ path: string }>
}

interface Window {
  pibiDesktop?: PibiDesktopApi
}
