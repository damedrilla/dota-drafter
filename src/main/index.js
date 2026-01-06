import { app, shell, BrowserWindow, ipcMain} from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: "Dota 2 Draft Simulator",
    titleBarStyle: 'hidden',
    frame: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

    // propagate maximize/unmaximize so renderer UI can update
  win.on('maximize', () => win.webContents.send('window-maximize-changed', true));
  win.on('unmaximize', () => win.webContents.send('window-maximize-changed', false));

  // IPC window controls
  ipcMain.handle('window-minimize', () => win.minimize());
  ipcMain.handle('window-toggle-maximize', () => {
    if (win.isMaximized()) win.unmaximize(); else win.maximize();
    return win.isMaximized();
  });
  ipcMain.handle('window-close', () => win.close());
  ipcMain.handle('window-is-maximized', () => win.isMaximized());
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Settings persistence via userData
  ipcMain.handle('save-settings', async (_, data) => {
    try {
      const p = path.join(app.getPath('userData'), 'draft_settings.json');
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
      return { ok: true, path: p };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  ipcMain.handle('load-settings', async () => {
    try {
      const p = path.join(app.getPath('userData'), 'draft_settings.json');
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return { ok: true, data: JSON.parse(raw || '{}') };
      }
      return { ok: false, error: 'not-found' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Export draft: write JSON and Lua representations to provided path or directory
  ipcMain.handle('export-draft', async (_, { heroes, outPath }) => {
    try {
      if (!Array.isArray(heroes)) heroes = [];
      // normalize outPath: if empty, write to userData
      let target = outPath;
      if (!target) {
        target = path.join(app.getPath('userData'));
      }

      const isDir = fs.existsSync(target) && fs.statSync(target).isDirectory();
      const names = [];
      // prepare JSON and Lua content
      const jsonContent = JSON.stringify({ heroes: heroes.map(h => h) }, null, 2);
      const luaTable = `return {\n  heroes = { ${heroes.map(h => `"${h}"`).join(', ')} }\n}`;

      if (isDir) {
        const jsonPath = path.join(target, 'selected_heroes.json');
        const luaPath = path.join(target, 'selected_heroes.lua');
        fs.writeFileSync(jsonPath, jsonContent, 'utf8');
        fs.writeFileSync(luaPath, luaTable, 'utf8');
        names.push(jsonPath, luaPath);
      } else {
        // if target ends with .json or .lua, write accordingly; otherwise treat as file prefix
        const ext = path.extname(target).toLowerCase();
        if (ext === '.json') {
          fs.writeFileSync(target, jsonContent, 'utf8');
          names.push(target);
        } else if (ext === '.lua') {
          fs.writeFileSync(target, luaTable, 'utf8');
          names.push(target);
        } else {
          // treat as prefix path
          const jsonPath = `${target}.json`;
          const luaPath = `${target}.lua`;
          fs.writeFileSync(jsonPath, jsonContent, 'utf8');
          fs.writeFileSync(luaPath, luaTable, 'utf8');
          names.push(jsonPath, luaPath);
        }
      }

      return { ok: true, files: names };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Open a live draft window for broadcast/OBS. The renderer passes the current draft state.
  let _liveWindow = null;
  ipcMain.handle('open-live-window', async (_, state) => {
    try {
      const liveWin = new BrowserWindow({
        width: 1400,
        height: 420,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: true,
        skipTaskbar: true,
        webPreferences: {
          preload: join(__dirname, '../preload/index.js'),
          sandbox: false
        }
      });

      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        await liveWin.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#live`);
      } else {
        const indexPath = path.join(__dirname, '../renderer/index.html');
        await liveWin.loadURL(`file://${indexPath}#live`);
      }

      // store reference and send initial state after load
      _liveWindow = liveWin;
      liveWin.on('closed', () => { _liveWindow = null; });
      liveWin.webContents.once('did-finish-load', () => {
        liveWin.webContents.send('init-live-state', state || {});
      });

      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Allow renderer to push live updates to the open live window
  ipcMain.handle('update-live-state', async (_, state) => {
    try {
      if (_liveWindow && !_liveWindow.isDestroyed()) {
        _liveWindow.webContents.send('init-live-state', state || {});
        return { ok: true };
      }
      return { ok: false, error: 'no-live-window' };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // Open live view in the user's default browser (passes state in URL hash)
  ipcMain.handle('open-live-in-browser', async (_, state) => {
    try {
      let url;
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        url = `${process.env['ELECTRON_RENDERER_URL']}#live`;
      } else {
        const indexPath = path.join(__dirname, '../renderer/index.html');
        url = `file://${indexPath}#live`;
      }

      // Attach serialized state as a query fragment in the hash so browser can read it
      try {
        const json = JSON.stringify(state || {});
        const encoded = encodeURIComponent(json);
        // keep URL length reasonable — if too long, truncate and still open
        const maxLen = 20000; // generous but avoids absurdly long urls
        const payload = encoded.length > maxLen ? encoded.slice(0, maxLen) : encoded;
        url = `${url}?data=${payload}`;
      } catch (e) {
        // ignore serialization errors and open without state
      }

      await shell.openExternal(url);
      return { ok: true, url };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
