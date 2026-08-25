const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = process.env.PORT || 3000;
let serverProcess = null;

function startServer() {
  return new Promise((resolve, reject) => {
    // Start the Next.js production server: `npm run start`
    serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'start'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });

    serverProcess.stdout.on('data', (data) => {
      process.stdout.write(`[next] ${data}`);
    });
    serverProcess.stderr.on('data', (data) => {
      process.stderr.write(`[next] ${data}`);
    });

    // Poll for server availability
    const start = Date.now();
    const timeout = 60 * 1000; // 60s

    (function check() {
      const req = http.request({ method: 'GET', host: '127.0.0.1', port: PORT, path: '/' }, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for Next.js server'));
        } else {
          setTimeout(check, 500);
        }
      });
      req.end();
    })();
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      contextIsolation: true,
    },
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try { serverProcess.kill(); } catch (e) {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
