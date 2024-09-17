const { ipcRenderer } = require('electron');
const puppeteer = require('puppeteer');
const path = require('path');

const loginButton = document.getElementById('login-button');
const screenshotContainer = document.getElementById('screenshot-container');

loginButton.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  // Create a new Puppeteer browser instance
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Create a new page instance
  const page = await browser.newPage();

  // Navigate to the Google login page
  await page.goto('https://accounts.google.com/signin', { waitUntil: 'networkidle2' });

  // Enter the email
  await page.type('input[type="email"]', email);
  await page.click('button[type="submit"]');
  
  // Wait for the password field to appear and be interactable
  await page.waitForSelector('input[type="password"]', { visible: true });

  // Enter the password
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Define the screenshot path
  const fileName = 'screenshot'; // Modify this as needed
  const screenshotPath = path.join('files', 'google', fileName + '.png');

  // Take a screenshot of the page
  await page.screenshot({
    path: screenshotPath,
    type: 'png',
  });

  // Notify the main process about the screenshot path
  ipcRenderer.send('screenshot-saved', screenshotPath);

  // Display the screenshot in the container
  const screenshotImage = document.createElement('img');
  screenshotImage.src = screenshotPath;
  screenshotContainer.appendChild(screenshotImage);

  // Close the browser instance
  await browser.close();
});

// Listen for the 'login-user' event from the main process
ipcRenderer.on('login-user', async (event, { email, password }) => {
  // Fill in the email and password fields
  document.getElementById('email').value = email;
  document.getElementById('password').value = password;

  // Click the login button
  loginButton.click();
});
