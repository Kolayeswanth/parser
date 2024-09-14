let telegramBot = null;

async function startTelegramBot() {
    const sendLog = (message) => {
        const logsContainer = document.getElementById('logs');
        logsContainer.innerHTML += `<p>${message}</p>`;
        logsContainer.scrollTop = logsContainer.scrollHeight;
    };

    const waitForQRScan = async (qrCodeDataUrl) => {
        document.getElementById('qrCodeImage').src = qrCodeDataUrl;
        document.getElementById('qrCodeContainer').style.display = 'block';
        await new Promise((resolve) => {
            const intervalId = setInterval(() => {
                if (document.getElementById('qrCodeImage').src !== qrCodeDataUrl) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 1000);
        });
    };

    telegramBot = new TelegramBot(sendLog, waitForQRScan);
    await telegramBot.run();
}

function hideQRCode() {
    document.getElementById('qrCodeContainer').style.display = 'none';
}