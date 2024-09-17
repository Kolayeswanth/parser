const { ipcRenderer } = require("electron");

      // Back arrow functionality
      document.getElementById("backArrow").onclick = () => {
        window.location.href = "home.html";
      };

      // Show popup in the top-right corner
      function showResultPopup(message) {
        const resultPopup = document.getElementById("resultPopup");
        resultPopup.innerText = message;
        resultPopup.style.display = "block";

        // Hide the popup after 3 seconds
        setTimeout(() => {
          resultPopup.style.display = "none";
        }, 3000);
      }

      document
        .getElementById("loginWithQR")
        .addEventListener("click", async () => {
          try {
            const result = await window.electronAPI.startWhatsAppBot();
            if (result.success) {
              showResultPopup("WhatsApp bot started successfully");
            } else {
              showResultPopup("Error starting WhatsApp bot: " + result.error);
            }
          } catch (error) {
            showResultPopup("Error: " + error.message);
          }
        });

      document.getElementById("confirmQRScan").addEventListener("click", () => {
        window.electronAPI.confirmQRCodeScanned();
        document.getElementById("qrModal").style.display = "none";
      });

      window.electronAPI.onShowQRCode((qrCodeDataUrl) => {
        document.getElementById("qrCode").src = qrCodeDataUrl;
        document.getElementById("qrModal").style.display = "block";
      });

      window.electronAPI.onUpdateLogs((log) => {
        const logsDiv = document.getElementById("logs");
        const logElement = document.createElement("p");
        logElement.innerText = log;
        logsDiv.appendChild(logElement);
        logsDiv.scrollTop = logsDiv.scrollHeight;
      });

      window.electronAPI.onShowConversationsModal((conversations) => {
        const conversationList = document.getElementById("conversationList");
        conversationList.innerHTML = ''; // Clear the list

        // Show only top 10 conversations
        const topConversations = conversations.slice(0, 10);

        // Populate the modal with conversation names
        topConversations.forEach((conversation, index) => {
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.id = `conversation-${index}`;
          checkbox.value = conversation;

          const label = document.createElement("label");
          label.htmlFor = `conversation-${index}`;
          label.textContent = conversation;

          const div = document.createElement("div");
          div.appendChild(checkbox);
          div.appendChild(label);

          conversationList.appendChild(div);
        });

        // Select/Deselect all conversations
        document.getElementById("selectAll").onclick = (e) => {
          const checkboxes = conversationList.querySelectorAll("input[type='checkbox']");
          checkboxes.forEach((checkbox) => {
            checkbox.checked = e.target.checked;
          });
        };

        document.getElementById("conversationModal").style.display = "block";
      });

      document.getElementById("takeScreenshots").addEventListener("click", async () => {
        const selectedConversations = Array.from(
          document.querySelectorAll("#conversationList input:checked")
        ).map((checkbox) => checkbox.value);

        if (selectedConversations.length > 0) {
          try {
            const result = await window.electronAPI.takeScreenshots(selectedConversations);
            if (result.success) {
              alert("Screenshots taken successfully!");
              document.getElementById("conversationModal").style.display = "none";
            } else {
              alert("Error taking screenshots: " + result.error);
            }
          } catch (error) {
            alert("Error: " + error.message);
          }
        } else {
          alert("Please select at least one conversation.");
        }
      });

      // Close modal when clicking on the close button or outside the modal
      window.onclick = function (event) {
        if (event.target.classList.contains("modal")) {
          event.target.style.display = "none";
        }
      };

      document.querySelectorAll(".close").forEach((closeBtn) => {
        closeBtn.onclick = function () {
          this.closest(".modal").style.display = "none";
        };
      });