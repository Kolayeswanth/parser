
        const { ipcRenderer } = require('electron');

        document.getElementById("loginForm").addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitButton = document.getElementById("submitBtn");
            submitButton.disabled = true;

            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            try {
                const result = await ipcRenderer.invoke("start-facebook-bot", {
                    username,
                    password,
                });

                if (result.success) {
                    document.getElementById("result").innerText = "Bot process completed.";
                    document.getElementById("loginForm").reset();
                } else {
                    document.getElementById("result").innerText = "Error: " + result.error;
                }
            } catch (error) {
                document.getElementById("result").innerText = "Unexpected error: " + error.message;
            }

            submitButton.disabled = false;
        });

        ipcRenderer.on("update-logs", (event, log) => {
            const logsDiv = document.getElementById("logs");
            const logElement = document.createElement("p");
            logElement.innerText = log;
            logsDiv.appendChild(logElement);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        });

        ipcRenderer.on('show-2fa-input', () => {
            document.getElementById('two-factor-code').style.display = 'block';
            document.getElementById('submit-2fa-code').style.display = 'block';
        });

        document.getElementById('submit-2fa-code').addEventListener('click', () => {
            const code = document.getElementById('two-factor-code').value;
            ipcRenderer.send('submit-2fa-code', code);
            document.getElementById('two-factor-code').style.display = 'none';
            document.getElementById('submit-2fa-code').style.display = 'none';
        });
    