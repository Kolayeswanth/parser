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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    this.page = await this.browser.newPage();

    // Add event listeners to capture logs and errors
    this.page.on('console', msg => this.sendLog(`PAGE LOG: ${msg.text()}`));
    this.page.on('error', err => this.sendLog(`PAGE ERROR: ${err.message}`));
    this.page.on('pageerror', err => this.sendLog(`PAGE PAGEERROR: ${err.message}`));

    this.sendLog('Browser launched successfully');
  }

  async login() {
    this.sendLog('Navigating to Telegram Web...');
    await this.page.goto('https://web.telegram.org/k/', { waitUntil: 'networkidle0' });
    await this.page.setDefaultTimeout(120000); // Increase timeout to 2 minutes

    this.sendLog('Waiting for QR code...');
    const qrCodeDataUrl = await this.getQRCode();
    if (qrCodeDataUrl) {
      this.sendLog('QR code generated. Please scan with your phone.');
      await this.waitForQRScan(qrCodeDataUrl);
      this.sendLog('Waiting for login...');
      await this.waitForLogin();
      this.sendLog('Successfully logged in to Telegram Web');
    } else {
      this.sendLog('QR code not found.');
      throw new Error('QR code not found.');
    }
  }

  async getQRCode() {
    try {
      await this.page.waitForSelector('canvas', { timeout: 60000 });  // Ensure correct selector for QR code
      return await this.page.evaluate(() => {
        const qrCanvas = document.querySelector('canvas');
        return qrCanvas ? qrCanvas.toDataURL() : null;
      });
    } catch (error) {
      this.sendLog('Error getting QR code. Please check if Telegram Web has changed its structure.');
      throw error;
    }
  }

  async waitForLogin() {
    this.sendLog('Waiting for login to complete...');
    try {
      await this.page.waitForFunction(() => {
        const chatList = document.querySelector('[aria-label="Chat list"]');
        return chatList !== null;
      }, { timeout: 90000 });

      const isLoggedIn = await this.page.evaluate(() => {
        const chatList = document.querySelector('[aria-label="Chat list"]');
        return chatList !== null;
      });

      if (isLoggedIn) {
        this.sendLog('Successfully logged in to Telegram Web. Chats loaded.');
      } else {
        throw new Error('Login failed. Chat list not found.');
      }
    } catch (error) {
      this.sendLog('Login failed. Please make sure you scanned the QR code correctly and your internet connection is stable.');
      throw error;
    }
  }

  async takeFullPageScreenshot(fileName) {
    try {
      const screenshotPath = path.join(__dirname, "files", "telegram", fileName + ".png");
      await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.sendLog(`Saved screenshot: ${fileName}.png`);
    } catch (error) {
      this.sendLog(`Error taking full-page screenshot: ${error.message}`);
    }
  }

  async performActions() {
    this.sendLog('Performing Telegram actions...');
    // Add Telegram-specific actions here
    this.sendLog('Telegram actions completed');
  }
}

module.exports = TelegramBot;