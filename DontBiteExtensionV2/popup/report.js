document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(
      [
        "lastGeminiReason",
        "lastEmailThreat",
        "emailsAnalyzed",
        "threatsDetected",
        "lastSender",
        "lastSubject",
        "lastLinks",
        "lastAttachments"
      ],
      (data) => {
        document.getElementById("gemini-reason").textContent = data.lastGeminiReason || "No reason provided.";
  
        // ✅ Fix this block
        const sender = data.lastSender || {};
        document.getElementById("sender-name").textContent = sender.name || "Unknown";
        document.getElementById("sender-email").textContent = sender.email || "Unknown";
        document.getElementById("email-subject").textContent = data.lastSubject || "No Subject";
  
        const linksList = document.getElementById("links-list");
        (data.lastLinks || []).forEach(link => {
          const li = document.createElement("li");
          li.textContent = link;
          linksList.appendChild(li);
        });
  
        const attachmentsList = document.getElementById("attachments-list");
        (data.lastAttachments || []).forEach(att => {
          const li = document.createElement("li");
          li.textContent = att;
          attachmentsList.appendChild(li);
        });
      }
    );
  });
  