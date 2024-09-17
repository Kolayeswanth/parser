const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class TelegramBot {
    constructor(sendLog, waitForQRScan, email) {
        this.sendLog = sendLog;
        this.waitForQRScan = waitForQRScan;
        this.email = email;
        this.browser = null;
        this.page = null;
        this.sessionFolder = null;
    }

    async run() {
        try {
            if (!this.email) {
                throw new Error('User email is not set.');
            }
            await this.createSessionFolder();
            await this.launch();
            await this.login();
            await this.takeFullPageScreenshot('telegram_logged_in');
    
            const conversations = await this.getTopConversations(10);
            this.sendLog('Fetched top conversations.');
    
            return conversations;
        } catch (error) {
            this.sendLog(`Error: ${error.message}`);
            throw error;
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
        this.page.setDefaultTimeout(120000); // Increase timeout to 2 minutes
        this.sendLog('Waiting for QR code...');
        const qrCodeDataUrl = await this.getQRCode();
        this.sendLog('QR code generated. Please scan with your phone.');
        
        await this.waitForQRScan(qrCodeDataUrl);
        this.sendLog('Waiting for login...');

        await this.waitForLogin();
        await this.handlePermissions();
        this.sendLog('Successfully logged in to Telegram Web');
    }

    async handlePermissions() {
        this.sendLog('Handling permissions...');
        try {
            // Wait for the permissions dialog to appear (adjust the selector as needed)
            await this.page.waitForSelector('.permissions-dialog', { timeout: 10000 });
            
            // Click the allow button (adjust the selector as needed)
            await this.page.click('.permissions-dialog .allow-button');
            
            this.sendLog('Permissions handled successfully.');
        } catch (error) {
            this.sendLog('No permissions dialog found or error occurred. Continuing...');
        }
    }

    async getQRCode() {
        try {
            await this.page.waitForSelector('canvas.qr-canvas', { timeout: 60000 });
            return await this.page.evaluate(() => {
                const canvas = document.querySelector('canvas.qr-canvas');
                return canvas ? canvas.toDataURL() : null;
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
                const searchBox = document.querySelector('input.input-search-input');
                return searchBox !== null;
            }, { timeout: 90000 });

            this.sendLog('Successfully logged in to Telegram Web.');
        } catch (error) {
            this.sendLog('Login failed. Please make sure you scanned the QR code correctly and your internet connection is stable.');
            throw new Error('Login failed.');
        }
    }

    async getTopConversations(limit = 10) {
        this.sendLog('Fetching top conversations...');
        const conversations = await this.page.evaluate((limit) => {
            const chatElements = Array.from(document.querySelectorAll('a.chatlist-chat .peer-title'));
            return chatElements.slice(0, limit).map(chat => chat.innerText || 'Unknown');
        }, limit);
        this.sendLog('Conversations fetched successfully.');
        return conversations;
    }

    async takeScreenshots(conversations) {
        this.sendLog('Taking screenshots of selected conversations...');
        for (const conversation of conversations) {
            try {
                await this.searchConversation(conversation);
                await this.takeFullPageScreenshot(conversation);
                await this.closeConversation();
            } catch (error) {
                this.sendLog(`Error processing conversation "${conversation}": ${error.message}`);
                // Continue with the next conversation
            }
        }
        this.sendLog('Screenshots taken successfully.');
    }

    async waitForConversationLoad() {
        this.sendLog('Waiting for conversation to fully load...');
        try {
            // Wait for messages to load
            await this.page.waitForSelector('.message', { timeout: 30000 });
            
            // Wait for the sidebar close button to appear
            await this.page.waitForSelector('button.sidebar-close-button', { visible: true, timeout: 10000 });
            
            // Wait an additional second for any dynamic content to load
            await this.page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
            
            this.sendLog('Conversation loaded successfully.');
        } catch (error) {
            this.sendLog('Error waiting for conversation to load: ' + error.message);
            throw error;
        }
    }

    async closeConversation() {
        this.sendLog('Closing current conversation...');
        try {
            // Wait for the close button to be visible and clickable
            await this.page.waitForSelector('button.sidebar-close-button', { visible: true, timeout: 10000 });
            
            // Click the close button
            await this.page.click('button.sidebar-close-button');
            
            // Wait for the conversation list to become visible again
            await this.page.waitForSelector('input.input-search-input', { visible: true, timeout: 10000 });
            
            this.sendLog('Conversation closed successfully.');
        } catch (error) {
            this.sendLog('Error closing conversation: ' + error.message);
            throw error;
        }
    }

    async searchConversation(conversationName) {
        this.sendLog(`Searching for conversation: ${conversationName}`);
        try {
            await this.page.waitForSelector('input.input-search-input', { timeout: 20000 });
            await this.page.click('input.input-search-input');

            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('A');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');

            await this.page.keyboard.type(conversationName, { delay: 100 });
            
            // Wait for search results to populate
            await this.page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

            // Wait for and click on the first search result
            await this.page.waitForSelector('a.chatlist-chat', { timeout: 20000 });
            await this.page.click('a.chatlist-chat');

            // Wait for the conversation to load
            await this.waitForConversationLoad();
        } catch (error) {
            this.sendLog(`Error searching for conversation "${conversationName}": ${error.message}`);
            throw error;
        }
    }

    async createSessionFolder() {
        const now = new Date();
        const dateTime = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        this.sessionFolder = path.join(__dirname, "..", "..", "files", this.email, "telegram", dateTime);
        await fs.mkdir(this.sessionFolder, { recursive: true });
        this.sendLog(`Created session folder: ${this.sessionFolder}`);
    }

    async takeFullPageScreenshot(conversationName) {
        try {
            if (!this.sessionFolder) {
                throw new Error('Session folder is not set. Cannot save screenshot.');
            }

            const fileName = conversationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const screenshotPath = path.join(this.sessionFolder, `${fileName}.png`);
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.sendLog(`Screenshot saved: ${screenshotPath}`);
        } catch (error) {
            this.sendLog(`Error taking screenshot for ${conversationName}: ${error.message}`);
            throw error;
        }
    }

    async close() {
        if (this.browser) {
            this.sendLog('Closing browser...');
            await this.browser.close();
        }
    }
}

module.exports = TelegramBot;
