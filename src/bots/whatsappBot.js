const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppBot {
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
            await this.takeFullPageScreenshot('whatsapp_logged_in');
    
            // Get the top 10 conversations
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
        this.sendLog('Navigating to WhatsApp Web...');
        this.page.goto('https://web.whatsapp.com/', { waitUntil: 'networkidle0' });
        this.page.setDefaultTimeout(120000); // Increase timeout to 2 minutes
        this.sendLog('Waiting for QR code...');
        const qrCodeDataUrl = await this.getQRCode();
        this.sendLog('QR code generated. Please scan with your phone.');

        await this.waitForQRScan(qrCodeDataUrl);
        this.sendLog('Waiting for login...');

        await this.waitForLogin();
        this.sendLog('Successfully logged in to WhatsApp Web');
        this.sendLog('Waiting for chats to sync...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.sendLog('Chats should now be synced');
    }

    async getTopConversations(limit = 10) {
        this.sendLog('Fetching top conversations...');
        const conversations = await this.page.evaluate((limit) => {
            // Targeting the chat container div with class '_ak8q' and fetching the title spans
            const chatElements = Array.from(document.querySelectorAll('div._ak8q span[title]'));
            return chatElements.slice(0, limit).map(chat => chat.innerText || 'Unknown');
        }, limit);
        this.sendLog('Conversations fetched successfully.');
        return conversations;
    }
    
    

    async takeScreenshots(conversations) {
        this.sendLog('Taking screenshots of selected conversations...');
        for (const conversation of conversations) {
            await this.searchConversation(conversation);
            await this.takeFullPageScreenshot(conversation);
        }
        this.sendLog('Screenshots taken successfully.');
    }

    async close() {
        if (this.browser) {
            this.sendLog('Closing browser...');
            await this.browser.close();
        }
    }
    
    async searchConversation(conversationName) {
        this.sendLog(`Searching for conversation: ${conversationName}`);
        try {
            await this.page.waitForSelector('div[contenteditable="true"]', { timeout: 20000 });
            await this.page.click('div[contenteditable="true"]');
    
            // Clear input
            await this.page.keyboard.down('Control');
            await this.page.keyboard.press('A');
            await this.page.keyboard.up('Control');
            await this.page.keyboard.press('Backspace');
    
            // Type and search
            await this.page.keyboard.type(conversationName, { delay: 100 });
            await this.page.keyboard.press('Enter');
    
            // Wait for chat to load
            await this.page.waitForSelector('header._amid', { timeout: 20000 });
        } catch (error) {
            this.sendLog(`Error searching for conversation "${conversationName}": ${error.message}`);
            throw error;
        }
    }
    
    async createSessionFolder() {
        // Get current date and time
        const now = new Date();
        const dateTime = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

        // Create a single directory for all screenshots
        this.sessionFolder = path.join(__dirname, "..", "..", "files", this.email, "whatsapp", dateTime);
        await fs.mkdir(this.sessionFolder, { recursive: true });
        this.sendLog(`Created session folder: ${this.sessionFolder}`);
    }

    async takeFullPageScreenshot(conversationName) {
        try {
            if (!this.sessionFolder) {
                throw new Error('Session folder is not set. Cannot save screenshot.');
            }
    
            // Clean up the conversation name to make it a valid filename
            const fileName = conversationName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            
            // Ensure fileName is valid
            if (!fileName) {
                throw new Error('Invalid conversation name. Cannot create file name.');
            }
    
            const screenshotPath = path.join(this.sessionFolder, `${fileName}.png`);
    
            // Take the screenshot and save it to the path
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.sendLog(`Screenshot saved: ${screenshotPath}`);
        } catch (error) {
            this.sendLog(`Error taking screenshot for ${conversationName}: ${error.message}`);
            throw error;
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

    async waitForLogin() {
        this.sendLog('Waiting for login to complete...');
        try {
            await this.page.waitForFunction(() => {
                const searchBox = document.querySelector('div[contenteditable="true"]');
                return searchBox !== null;
            }, { timeout: 90000 });

            const isLoggedIn = await this.page.evaluate(() => {
                const searchBox = document.querySelector('div[contenteditable="true"]');
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
}

module.exports = WhatsAppBot;