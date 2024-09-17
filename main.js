const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const InstagramBot = require("./src/bots/instagramBot");
const FacebookBot = require("./src/bots/facebookBot");
const TwitterBot = require("./src/bots/twitterBot");
const WhatsAppBot = require("./src/bots/whatsappBot");
const TelegramBot = require("./src/bots/telegramBot");
const { supabase } = require('./supabaseClient');
const fs = require("fs").promises;
const  EmailBot  = require("./src/bots/emailBot"); // Change this line

let mainWindow;
let userEmail;
let whatsAppBot;
let telegramBot;

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
        waitForTwoFactorCodei,
        userEmail
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
    mainWindow.webContents.send('show-qr-code', qrCodeDataUrl);
    ipcMain.once('qr-code-scanned', () => {
      resolve();
    });
  });
}

ipcMain.handle('start-whatsapp-bot', async () => {
  const sendLog = (message) => {
      mainWindow.webContents.send('update-logs', message);
  };

  try {
      if (!userEmail) {
          throw new Error('User email is not set.');
      }

      whatsAppBot = new WhatsAppBot(sendLog, waitForQRScan, userEmail);
      const conversations = await whatsAppBot.run();

      // Send conversations to the frontend
      mainWindow.webContents.send('show-conversations-modal', conversations);

      return { success: true };
  } catch (error) {
      sendLog(`Error: ${error.message}`);
      console.error('Error occurred in WhatsApp bot:', error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('take-screenshots', async (_event, conversations) => {
  try {
    await whatsAppBot.takeScreenshots(conversations);
    return { success: true };
  } catch (error) {
    console.error('Error taking screenshots:', error);
    return { success: false, error: error.message };
  } finally {
    await whatsAppBot.close();
  }
});
ipcMain.handle('start-telegram-bot', async () => {
  const sendLog = (message) => {
    mainWindow.webContents.send('update-logs', message);
  };

  try {
    if (!userEmail) {
      throw new Error('User email is not set.');
    }

    telegramBot = new TelegramBot(sendLog, waitForQRScan, userEmail);
    const conversations = await telegramBot.run();

    mainWindow.webContents.send('show-conversations-modal', conversations);

    return { success: true };
  } catch (error) {
    sendLog(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
});


ipcMain.handle('take-telegram-screenshots', async (_event, conversations) => {
  try {
    await telegramBot.takeScreenshots(conversations);
    return { success: true };
  } catch (error) {
    console.error('Error taking screenshots:', error);
    return { success: false, error: error.message };
  } finally {
    await telegramBot.close();
  }
});


ipcMain.handle('login-user', async (_event, { email, password }) => {
  try {
    // First, query the users table to get the user with the provided email
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

    // Check if the provided password matches the stored password
    if (users.password !== password) {
      throw new Error('Invalid credentials');
    }
    
    // If login is successful, create user folder and store email
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

ipcMain.handle('open-image', async (_event, imagePath) => {
  try {
    const baseDir = path.join(process.cwd(), 'files', userEmail);
    const fullPath = path.join(baseDir, imagePath);


    // Check if the file exists
    await fs.access(fullPath);

    const imageWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    await imageWindow.loadFile(fullPath);

    return { success: true };
  } catch (error) {
    console.error('Error opening image:', error);
    return { error: error.message };
  }
});

ipcMain.handle('explore-directory', async (_event, directoryPath) => {
  try {
    return await exploreDirectory(directoryPath);
  } catch (error) {
    return { error: error.message };
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
