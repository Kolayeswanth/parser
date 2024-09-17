const { ipcRenderer } = require('electron');

// Directly exposing electronAPI to window since context isolation is false
window.electronAPI = {
  send2FACode: (code) => ipcRenderer.send('submit-2fa-code', code),
  onUpdateLogs: (callback) => ipcRenderer.on('update-logs', (event, message) => callback(message)),
  onShow2FAInput: (callback) => ipcRenderer.on('show-2fa-input', () => callback()),
  onShowOtherVerification: (callback) => ipcRenderer.on('show-other-verification', () => callback()),
  loginWithQR: () => ipcRenderer.invoke('login-with-qr'),
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),
  loginUser: (email, password) => ipcRenderer.invoke('login-user', { email, password }),
  getUserFiles: () => ipcRenderer.invoke('get-user-files'),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args), // Directly added invoke function
  onUpdateLogs: (callback) => ipcRenderer.on('update-logs', (event, message) => callback(message)),
  onShowQRCode: (callback) => ipcRenderer.on('show-qr-code', (event, qrCodePath) => callback(qrCodePath)),
  qrCodeScanned: () => ipcRenderer.send('qr-code-scanned'),
  getQRCode: () => ipcRenderer.invoke('start-whatsapp-bot'),
  startTelegramBot: () => ipcRenderer.invoke('start-telegram-bot'),
  waitForLogin: () => ipcRenderer.invoke('wait-for-login'),

};

