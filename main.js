const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;

const InstagramBot = require("./src/bots/instagramBot");
const FacebookBot = require("./src/bots/facebookBot");
const TwitterBot = require("./src/bots/twitterBot");
const WhatsAppBot = require("./src/bots/whatsappBot");
const TelegramBot = require("./src/bots/telegramBot");
const EmailBot = require("./src/bots/emailBot"); // Corrected line
const { supabase } = require('./supabaseClient');

let mainWindow;
let userEmail;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html").catch((err) => {
    console.error("Failed to load index.html:", err);
  });
}

function waitForVerificationInput(prompt) {
  return new Promise((resolve) => {
    mainWindow.webContents.send("show-verification-input", prompt);
    ipcMain.once("submit-verification", (_event, input) => {
      resolve(input);
    });
  });
}

function waitForTwoFactorCode() {
  return new Promise((resolve) => {
    ipcMain.once("submit-2fa-code", (_event, code) => {
      resolve(code);
    });
  });
}

function waitForTwoFactorCodei() {
  return new Promise((resolve) => {
    mainWindow.webContents.send("show-2fa-input");
    ipcMain.once("submit-2fa-code", (_event, code) => {
      resolve(code);
    });
  });
}

ipcMain.handle("start-email-search", async (_event, { email }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-email-search-logs", message);
  };

  try {
    const bot = new EmailBot(email, sendLog);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Email bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-instagram-bot", async (_event, { username, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new InstagramBot(username, password, sendLog, waitForTwoFactorCodei, userEmail);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Instagram bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-facebook-bot", async (_event, { username, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new FacebookBot(username, password, sendLog, waitForTwoFactorCode);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Facebook bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-twitter-bot", async (_event, { username, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new TwitterBot(username, password, sendLog, waitForVerificationInput);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Twitter bot:", error);
    return { success: false, error: error.message };
  }
});

function waitForQRScan(qrCodeDataUrl) {
  return new Promise((resolve) => {
    mainWindow.webContents.send("show-qr-code", qrCodeDataUrl);
    ipcMain.once("qr-code-scanned", () => {
      resolve();
    });
  });
}

ipcMain.handle("start-whatsapp-bot", async () => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new WhatsAppBot(sendLog, waitForQRScan);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in WhatsApp bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-telegram-bot", async () => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  const waitForQRScan = (qrCodePath) => {
    return new Promise((resolve) => {
      ipcMain.once('qr-code-scanned', () => {
        resolve();
      });
      mainWindow.webContents.send('show-qr-code', qrCodePath);
      setTimeout(() => {
        resolve();
      }, 30000); // Add a 30-second timeout
    });
  };

  try {
    const bot = new TelegramBot(sendLog, waitForQRScan);
    await bot.run();
    const qrCodePath = path.join(process.cwd(), 'public', 'files', 'telegram', 'qr_code.png');
    return { success: true, qrCodePath: '/files/telegram/qr_code.png' };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Telegram bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("start-google-bot", async (_event, { username, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new GoogleBot(username, password, sendLog);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Google bot:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('login-user', async (_event, { email, password }) => {
  try {
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (queryError) {
      throw new Error('Error querying user');
    }

    if (!users) {
      throw new Error('User not found');
    }

    if (users.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    userEmail = email;
    await createUserFolder(email);
    
    return { success: true, user: { id: users.id, email: users.email } };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

async function getFileDetails(filePath) {
  const stats = await fs.stat(filePath);
  return {
    name: path.basename(filePath),
    isDirectory: stats.isDirectory(),
    size: stats.size,
    modifiedDate: stats.mtime
  };
}

async function createUserFolder(email) {
  const userFolderPath = path.join(process.cwd(), 'files', email);

  try {
    await fs.access(userFolderPath);
    console.log(`Folder already exists: ${userFolderPath}`);
  } catch {
    try {
      await fs.mkdir(userFolderPath, { recursive: true });
      console.log(`Created folder for user: ${userFolderPath}`);
    } catch (error) {
      console.error(`Error creating user folder: ${error}`);
    }
  }
}

async function exploreDirectory(directoryPath) {
  if (!userEmail) {
    throw new Error('User not logged in');
  }

  const baseDir = path.join(process.cwd(), 'files', userEmail);
  const fullPath = path.join(baseDir, directoryPath);

  console.log('Exploring directory:', fullPath);

  const files = await fs.readdir(fullPath);

  const fileDetails = await Promise.all(files.map(async (file) => {
    const filePath = path.join(fullPath, file);
    const details = await getFileDetails(filePath);
    if (details.isDirectory) {
      details.children = await exploreDirectory(path.join(directoryPath, file))
        .then(result => result.files)
        .catch(() => []);
    }
    return details;
  }));

  return {
    currentPath: directoryPath,
    files: fileDetails
  };
}

ipcMain.handle('open-image', async (event, imagePath) => {
  try {
    const baseDir = path.join(process.cwd(), 'files', userEmail);
    const fullPath = path.join(baseDir, imagePath);

    console.log('Attempting to open image:', fullPath);

    await fs.access(fullPath);

    const imageWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    imageWindow.loadURL(`file://${fullPath}`);
  } catch (error) {
    console.error('Error opening image:', error);
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
