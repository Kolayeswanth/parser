const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const InstagramBot = require("./src/bots/instagramBot");
const FacebookBot = require("./src/bots/facebookBot");
const TwitterBot = require("./src/bots/twitterBot");
const WhatsAppBot = require("./src/bots/whatsappBot");
const TelegramBot = require("./src/bots/telegramBot");

let mainWindow;

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

  mainWindow.loadFile("./src/home.html").catch((err) => {
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

ipcMain.handle(
  "start-instagram-bot",
  async (_event, { username, password }) => {
    const sendLog = (message) => {
      mainWindow.webContents.send("update-logs", message);
    };

    try {
      const bot = new InstagramBot(
        username,
        password,
        sendLog,
        waitForTwoFactorCodei
      );
      await bot.run();
      return { success: true };
    } catch (error) {
      sendLog(`Error: ${error.message}`);
      console.error("Error occurred in Instagram bot:", error);
      return { success: false, error: error.message };
    }
  }
);

ipcMain.handle("start-facebook-bot", async (_event, { username, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new FacebookBot(
      username,
      password,
      sendLog,
      waitForTwoFactorCode
    );
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
    const bot = new TwitterBot(
      username,
      password,
      sendLog,
      waitForVerificationInput
    );
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

// Telegram bot handler, properly structured
ipcMain.handle("start-telegram-bot", async (_event, { phoneNumber, password }) => {
  const sendLog = (message) => {
    mainWindow.webContents.send("update-logs", message);
  };

  try {
    const bot = new TelegramBot(sendLog, waitForQRScan);
    await bot.run();
    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    console.error("Error occurred in Telegram bot:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("quit", () => {
  // Handle app quit event
});

ipcMain.on("quit-app", () => {
  app.quit();
});
