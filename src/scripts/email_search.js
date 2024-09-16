const { ipcRenderer } = require('electron');

document.getElementById("emailSearchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitButton = document.getElementById("startEmailSearch");
    submitButton.disabled = true;

    const email = document.getElementById("emailInput").value;

    try {
        const result = await ipcRenderer.invoke("start-email-search", { email });

        if (result.success) {
            document.getElementById("emailSearchResult").innerText = "Email search process completed.";
            document.getElementById("emailSearchForm").reset();
        } else {
            document.getElementById("emailSearchResult").innerText = "Error: " + result.error;
        }
    } catch (error) {
        document.getElementById("emailSearchResult").innerText = "Unexpected error: " + error.message;
    }

    submitButton.disabled = false;
});

ipcRenderer.on("update-email-search-logs", (event, log) => {
    const logsDiv = document.getElementById("emailSearchLogs");
    const logElement = document.createElement("p");
    logElement.innerText = log;
    if (log.includes("Completed")) {
        logElement.innerHTML += ' ✓';
        logElement.style.color = 'green';
    } else if (log.includes("Loading")) {
        logElement.style.color = 'blue';
    }
    logsDiv.appendChild(logElement);
    logsDiv.scrollTop = logsDiv.scrollHeight;
});