document.getElementById('loginWithQR').addEventListener('click', async () => {
    try {
        const qrCodeData = await window.electronAPI.getQRCode();
        document.getElementById('qrCode').src = qrCodeData;
        document.getElementById('qrModal').style.display = 'block';
        waitForLogin();
    } catch (error) {
        document.getElementById('result').innerText = 'Error getting QR code: ' + error.message;
    }
});

document.getElementById('loginWithPhone').addEventListener('click', () => {
    document.getElementById('phoneModal').style.display = 'block';
});

document.getElementById('phoneForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const countryCode = document.getElementById('countryCode').value;
    const phoneNumber = document.getElementById('phoneNumber').value;
    try {
        await window.electronAPI.submitPhoneNumber({ countryCode, phoneNumber });
        document.getElementById('phoneModal').style.display = 'none';
        waitForLogin();
    } catch (error) {
        document.getElementById('result').innerText = 'Error submitting phone number: ' + error.message;
    }
});

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        closeBtn.closest('.modal').style.display = 'none';
    });
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};

async function waitForLogin() {
    try {
        const result = await window.electronAPI.waitForLogin();
        if (result.success) {
            document.getElementById('result').innerText = 'Login successful! Chats are loading...';
        } else {
            document.getElementById('result').innerText = 'Login failed: ' + result.error;
        }
    } catch (error) {
        document.getElementById('result').innerText = 'Error during login: ' + error.message;
    }
}

window.electronAPI.onUpdateLogs((log) => {
    const logsDiv = document.getElementById('logs');
    const logElement = document.createElement('p');
    logElement.innerText = log;
    logsDiv.appendChild(logElement);
    logsDiv.scrollTop = logsDiv.scrollHeight;
});