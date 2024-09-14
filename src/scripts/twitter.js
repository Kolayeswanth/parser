const { ipcRenderer } = require('electron');

        document.getElementById("loginForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const submitButton = document.getElementById("submitBtn");
            submitButton.disabled = true;
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            try {
                const result = await ipcRenderer.invoke("start-twitter-bot", { username, password });
                handleBotResult(result);
            } catch (error) {
                document.getElementById("result").innerText = "Unexpected error: " + error.message;
            }

            submitButton.disabled = false;
        });

        function handleBotResult(result) {
            if (result.success) {
                document.getElementById("result").innerText = "Bot process completed.";
                document.getElementById("loginForm").reset();
            } else {
                document.getElementById("result").innerText = "Error: " + result.error;
            }
        }

        function showVerificationInput(prompt) {
            document.getElementById('verification-prompt').innerText = prompt;
            document.getElementById('verification-prompt').style.display = 'block';
            document.getElementById('verification-input').style.display = 'block';
            document.getElementById('submit-verification').style.display = 'block';
        }

        function hideVerificationInput() {
            document.getElementById('verification-prompt').style.display = 'none';
            document.getElementById('verification-input').style.display = 'none';
            document.getElementById('submit-verification').style.display = 'none';
        }

        document.getElementById('submit-verification').addEventListener('click', () => {
            const info = document.getElementById('verification-input').value;
            ipcRenderer.send('submit-verification', info);
            hideVerificationInput();
        });

        ipcRenderer.on("update-logs", (event, log) => {
            const logsDiv = document.getElementById("logs");
            const logElement = document.createElement("p");
            logElement.innerText = log;
            logsDiv.appendChild(logElement);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        });

        ipcRenderer.on('show-verification-input', (event, prompt) => showVerificationInput(prompt));
        
        document.querySelector('.back-arrow').addEventListener('click', function(event) {
            event.preventDefault();
            window.location.href = "index.html"; // Ensure "index.html" exists and is the correct path
        });