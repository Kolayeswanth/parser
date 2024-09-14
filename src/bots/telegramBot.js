const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class TelegramBot {
  constructor(sendLog, waitForQRScan) {
    this.sendLog = sendLog;
    this.waitForQRScan = waitForQRScan;
    this.browser = null;
    this.page = null;
  }

  async run() {
    try {
      await this.launch();
      await this.login();
      await this.takeFullPageScreenshot('telegram_logged_in');
      await this.performActions();
    } catch (error) {
      this.sendLog(`Error: ${error.message}`);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  async launch() {
    this.sendLog('Launching browser...');
    this.browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    this.sendLog('Browser launched successfully');
  }

  async login() {
    this.sendLog('Navigating to Telegram Web...');
    await this.page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle0' });
    await this.page.setDefaultTimeout(120000); // Increase timeout to 2 minutes
  
    this.sendLog('Waiting for QR code...');
    const qrCodeDataUrl = await this.getQRCode();
    this.sendLog('QR code generated. Please scan with your phone.');
  
    await this.waitForQRScan(qrCodeDataUrl);
    this.sendLog('Waiting for login...');
    
    await this.waitForLogin();
    this.sendLog('Successfully logged in to Telegram Web');
  }
  
  async waitForLogin() {
    this.sendLog('Waiting for login to complete...');
    try {
        await this.page.waitForFunction(() => {
            const chatsButton = document.querySelector('a[data-icon="chat"]');
            const settingsButton = document.querySelector('a[data-icon="settings"]');
            return chatsButton !== null && settingsButton !== null;
        }, { timeout: 90000 });

        const isLoggedIn = await this.page.evaluate(() => {
            const chatsButton = document.querySelector('a[data-icon="chat"]');
            const settingsButton = document.querySelector('a[data-icon="settings"]');
            return chatsButton !== null && settingsButton !== null;
        });

        if (isLoggedIn) {
            this.sendLog('Successfully logged in to Telegram Web. Chats loaded.');
        } else {
            throw new Error('Login failed. Chats button or settings button not found.');
        }
    } catch (error) {
        this.sendLog('Login failed. Please make sure you scanned the QR code correctly and your internet connection is stable.');
        throw new Error('Login failed.');
    }
  }
  
  async getQRCode() {
    try {
      await this.page.waitForSelector('canvas', { timeout: 60000 });  // Example selector for a canvas element if QR code is drawn on a canvas
      return await this.page.evaluate(() => {
        // For canvas-based QR code
        const qrCanvas = document.querySelector('canvas');
        return qrCanvas ? qrCanvas.toDataURL() : null;
  
        // const qrCodeImage = document.querySelector('img'); // Adjust the tag name or attributes as needed
        // return qrCodeImage ? qrCodeImage.src : null;
      });
    } catch (error) {
      this.sendLog('Error getting QR code. Please check if Telegram Web has changed its structure.');
      throw error;
    }
  }
  

  async takeFullPageScreenshot(fileName) {
    const screenshotPath = path.join(__dirname, "files", "telegram", fileName + ".png");
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.sendLog("Screenshot saved: " + fileName);
  }

  async performActions() {
    this.sendLog('Performing Telegram actions...');
    await this.page.goto('https://web.telegram.org/k/#/im?p=c1241222122_15577221221212'); // Navigate to a specific page
    this.sendLog('Telegram actions completed');
  }
}

module.exports = TelegramBot;