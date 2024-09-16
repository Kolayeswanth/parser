const puppeteer = require('puppeteer');

class EmailBot {
  constructor(email, sendLog) {
    this.email = email;
    this.sendLog = sendLog;
  }

  async run() {
    this.sendLog("Starting Email Bot...");
    await this.openBrowsersAndFillForms();
    this.sendLog("Email Bot process completed.");
  }

  async openBrowsersAndFillForms() {
    try {
      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const [instagramPage, facebookPage, twitterPage] = await Promise.all([
        browser.newPage(),
        browser.newPage(),
        browser.newPage()
      ]);

      // Open Instagram, Facebook, and Twitter signup pages
      await instagramPage.goto('https://www.instagram.com/accounts/emailsignup/?hl=en', { waitUntil: 'networkidle2' });
      this.sendLog("Instagram Page loaded...");
      await facebookPage.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2' });
      this.sendLog("Facebbok Page loaded...");

      await twitterPage.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle2' });
      this.sendLog("Twiiter Page loaded...");

    //   Instagram signup interaction
      await this.fillInstagramForm(instagramPage);

      // Facebook signup interaction
      await this.fillFacebookForm(facebookPage);

      // Twitter signup interaction
      await this.fillTwitterForm(twitterPage);

      await browser.close();
    } catch (err) {
      this.sendLog(`Error in opening browsers or interacting with forms: ${err.message}`);
    }
  }

  async fillInstagramForm(page) {
    try {
      // Wait for the email input field to appear and fill it with the email
      await page.waitForSelector('input[name="emailOrPhone"]', { visible: true });
      await page.type('input[name="emailOrPhone"]', this.email);

      // Submit the form (Instagram often requires interacting with several steps, this is an example)
      await page.click('input[name="emailOrPhone"]');

      // Wait for any error message indicating if the email already exists
      const errorSelector = 'div.x6s0dn4.x972fbf';
      try {
        await page.waitForSelector(errorSelector, { timeout: 5000 });
        this.sendLog(`Instagram account exists for email: ${this.email}`);
      } catch (e) {
        this.sendLog(`No existing Instagram account found for email: ${this.email}`);
      }
    } catch (err) {
      this.sendLog(`Error interacting with Instagram: ${err.message}`);
    }
  }

  async fillFacebookForm(page) {
    try {
      // Wait for the email input field to appear and fill it with the email
      await page.waitForSelector('input#email', { visible: true });
      await page.type('input#email', this.email);
  
      // Click the login button
      await page.click('button#loginbutton');
  
      // Wait for the login result message
      const loginResultSelector = 'div._9ay7';
      
      try {
        // Wait for the error message (if any) after attempting to log in
        await page.waitForSelector(loginResultSelector, { timeout: 5000 });
        
        // Get the text content of the error message
        const errorMessage = await page.$eval(loginResultSelector, el => el.textContent);
  
        if (errorMessage.includes("The password that you've entered is incorrect")) {
          // If the error message says the password is incorrect, a Facebook account exists
          this.sendLog(`Facebook account exists for email: ${this.email}`);
        } else if (errorMessage.includes("The email address you entered isn't connected to an account")) {
          // If the error message says the email is not connected to an account
          this.sendLog(`No Facebook account found for email: ${this.email}`);
        } else {
          this.sendLog(`Unexpected response from Facebook for email: ${this.email}`);
        }
  
      } catch (e) {
        this.sendLog(`No error message appeared, could not determine Facebook account status for email: ${this.email}`);
      }
    } catch (err) {
      this.sendLog(`Error interacting with Facebook: ${err.message}`);
    }
  }

  async fillTwitterForm(page) { 
    try {
      await page.waitForSelector('input[autocomplete="username"]', { visible: true, timeout: 60000 });
      await page.type('input[autocomplete="username"]', this.email, { delay: 50 });

      // Press Tab key
      await page.keyboard.press('Tab');

      // Press Enter key
      await page.keyboard.press('Enter');


      // Check if the username input field is still present
      try {
        await page.waitForSelector('input[autocomplete="username"]', { timeout: 5000 });
        this.sendLog(`No Twitter account found for email: ${this.email}`);
      } catch (e) {
        // If the username input field is not present, assume the account exists
        this.sendLog(`Twitter Account exists for email: ${this.email}`);
      }

    } catch (err) {
      this.sendLog(`Error interacting with Twitter: ${err.message}`);
    }
  }

  

}

module.exports = EmailBot;
