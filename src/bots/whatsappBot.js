const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppBot {
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
      await this.takeFullPageScreenshot('whatsapp_logged_in');
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
    this.sendLog('Navigating to WhatsApp Web...');
    await this.page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle0' });
    await this.page.setDefaultTimeout(120000); // Increase timeout to 2 minutes
  
    this.sendLog('Waiting for QR code...');
    const qrCodeDataUrl = await this.getQRCode();
    this.sendLog('QR code generated. Please scan with your phone.');
  
    await this.waitForQRScan(qrCodeDataUrl);
    this.sendLog('Waiting for login...');
    
    await this.waitForLogin();
    this.sendLog('Successfully logged in to WhatsApp Web');
  }
  
  async waitForLogin() {
    this.sendLog('Waiting for login to complete...');
    try {
        await this.page.waitForFunction(() => {
            const searchBox = document.querySelector('div.x1hx0egp[contenteditable="true"]');
            return searchBox !== null;
        }, { timeout: 90000 });

        const isLoggedIn = await this.page.evaluate(() => {
            const searchBox = document.querySelector('div.x1hx0egp[contenteditable="true"]');
            return searchBox !== null;
        });

        if (isLoggedIn) {
            this.sendLog('Successfully logged in to WhatsApp Web. Chats loaded.');
        } else {
            throw new Error('Login failed. Search box not found.');
        }
    } catch (error) {
        this.sendLog('Login failed. Please make sure you scanned the QR code correctly and your internet connection is stable.');
        throw new Error('Login failed.');
    }
  }
  
  async getQRCode() {
    try {
      await this.page.waitForSelector('canvas', { timeout: 60000 });
      return await this.page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        return canvas ? canvas.toDataURL() : null;
      });
    } catch (error) {
      this.sendLog('Error getting QR code. Please check if WhatsApp Web has changed its structure.');
      throw error;
    }
  }

  async takeFullPageScreenshot(fileName) {
    const screenshotPath = path.join(__dirname, "files", "whatsapp", fileName + ".png");
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.sendLog("Screenshot saved: " + fileName);
  }

  async performActions() {
    this.sendLog('Performing WhatsApp actions...');
    // Implement your WhatsApp-specific actions here
    this.sendLog('WhatsApp actions completed');
  }
}

module.exports = WhatsAppBot;