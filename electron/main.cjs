const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(app.getPath('userData'), 'erp_persistence.json');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../build/icon.ico'),
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false 
    },
    autoHideMenuBar: true 
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
}

// IPC Handlers for Persistence with safeStorage
ipcMain.on('save-data-sync', (event, data) => {
  try {
    let finalData = data;
    const encryptionAvailable = typeof safeStorage !== 'undefined' && safeStorage.isEncryptionAvailable();
    
    if (encryptionAvailable) {
      finalData = safeStorage.encryptString(data);
    }

    fs.writeFileSync(DATA_FILE, finalData);
    event.returnValue = true;
  } catch (err) {
    console.error('Failed to save data:', err);
    event.returnValue = false;
  }
});

ipcMain.on('load-data-sync', (event) => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE);
      const encryptionAvailable = typeof safeStorage !== 'undefined' && safeStorage.isEncryptionAvailable();
      
      if (encryptionAvailable) {
        try {
          event.returnValue = safeStorage.decryptString(fileData);
          return;
        } catch (decryptErr) {
          console.warn('Decryption failed, might be unencrypted legacy data:', decryptErr);
          // If decryption fails, try to return as string if it was unencrypted
          event.returnValue = fileData.toString('utf8');
          return;
        }
      }
      event.returnValue = fileData.toString('utf8');
    } else {
      event.returnValue = null;
    }
  } catch (err) {
    console.error('Failed to load data:', err);
    event.returnValue = null;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});