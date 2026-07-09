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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
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
      try {
        finalData = safeStorage.encryptString(data);
        console.log('Data encrypted successfully');
      } catch (encryptErr) {
        console.error('Encryption failed, saving unencrypted:', encryptErr);
        console.warn('⚠️ WARNING: Data will be stored unencrypted due to encryption failure');
      }
    } else {
      console.warn('⚠️ WARNING: Encryption not available - data will be stored unencrypted');
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
          try {
            event.returnValue = fileData.toString('utf8');
            return;
          } catch (strErr) {
            console.error('Failed to read as string:', strErr);
            event.returnValue = null;
            return;
          }
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
