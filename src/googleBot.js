const { ipcRenderer } = require('electron');
const puppeteer = require('puppeteer');

const loginForm = document.getElementById('login-form');
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
  await page.goto('https://accounts.google.com/signin');

  // Enter the email and password
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);

  // Click the login button
  await page.click('button[type="submit"]');

  // Wait for the page to load
  await page.waitForNavigation();

  // Take a screenshot of the user's history
  const screenshot = await page.screenshot({
    path: 'screenshot.png',
    type: 'png',
  });

  // Display the screenshot in the container
  const screenshotImage = document.createElement('img');
  screenshotImage.src = 'screenshot.png';
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