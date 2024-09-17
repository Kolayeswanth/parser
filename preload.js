const { ipcRenderer } = require('electron');

// Directly exposing electronAPI to window since context isolation is false
window.electronAPI = {
  send2FACode: (code) => ipcRenderer.send('submit-2fa-code', code),
  onUpdateLogs: (callback) => ipcRenderer.on('update-logs', (event, message) => callback(message)),
  onShow2FAInput: (callback) => ipcRenderer.on('show-2fa-input', () => callback()),
  onShowOtherVerification: (callback) => ipcRenderer.on('show-other-verification', () => callback()),
  loginUser: (email, password) => ipcRenderer.invoke('login-user', { email, password }),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args) ,// Directly added invoke function
  startWhatsAppBot: () => ipcRenderer.invoke('start-whatsapp-bot'),
  takeScreenshots: (conversations) => ipcRenderer.invoke('take-screenshots', conversations),
  onShowConversationsModal: (callback) => ipcRenderer.on('show-conversations-modal', (_event, conversations) => callback(conversations)),
confirmQRCodeScanned: () => ipcRenderer.send('qr-code-scanned'),
  onShowQRCode: (callback) => ipcRenderer.on('show-qr-code', (_, qrCodeDataUrl) => callback(qrCodeDataUrl)),



  
};

