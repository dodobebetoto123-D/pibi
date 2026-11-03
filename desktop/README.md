# pibi Desktop

## Build the Windows installer

From the repository root, run:

```powershell
npm install
npm run desktop:dist
```

The NSIS installer is written to `release/pibi Setup 1.0.1.exe`.

## Local React PoC projects

Open a cloud project in pibi Desktop and select the React PoC step. Source files are saved under `Documents/Pibi React Projects/<project-id>`. Use **Save**, **Run**, and **Build** to edit files, open the Vite preview, and create a production build. **Open folder** opens the source directory in Explorer.

The desktop app uses the same Firebase account and cloud project as the web app. In Firebase Authentication settings, add `localhost` to Authorized domains if Firebase rejects sign-in from the desktop app.

The editor supports syntax highlighting, completion, Ctrl+S, and automatic save. The package installer uses the bundled npm runtime and requires internet; package installation scripts are disabled, so some packages require additional setup. The app uses localhost port 41785 and only one instance runs at a time.

After packaging, `node desktop-smoke.cjs` checks app startup, source files, npm installation, preview and production build using a temporary project.
