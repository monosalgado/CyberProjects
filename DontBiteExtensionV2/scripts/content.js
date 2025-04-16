let lastEmailId = null;

function getEmailBody() {
  const emailBody = document.querySelector('div.a3s.aiL');
  return emailBody ? emailBody.innerText : null;
}

function getSenderInfo() {
  const senderElement = document.querySelector("span.gD");
  const senderName = senderElement?.innerText || "Unknown";
  const senderEmail = senderElement?.getAttribute("email") || "Unknown";
  return { senderName, senderEmail };
}

function getEmailId() {
  const subject = document.querySelector("h2.hP")?.innerText || "";
  const senderEmail = document.querySelector("span.gD")?.getAttribute("email") || "";
  return subject + senderEmail;
}

function getEmailSubject() {
  return document.querySelector("h2.hP")?.innerText || "No Subject";
}

function extractHyperlinks() {
  const links = Array.from(document.querySelectorAll("div.a3s.aiL a"));
  return links.map(a => a.href).filter(href => href.startsWith("http"));
}

function getAttachmentInfo() {
  const attachmentElements = document.querySelectorAll('div.aQH span.aV3');
  return Array.from(attachmentElements).map(el => el.innerText.trim());
}

function getImageSources() {
  return Array.from(document.querySelectorAll('div.a3s.aiL img')).map(img => img.src);
}

function clickReportSpam() {
  const spamButton = Array.from(document.querySelectorAll("div[role='button']"))
    .find(el => el.getAttribute("data-tooltip")?.toLowerCase().includes("report spam"));
  if (spamButton) spamButton.click();
}

function clickDelete() {
  const deleteButton = Array.from(document.querySelectorAll("div[role='button']"))
    .find(el => el.getAttribute("data-tooltip")?.toLowerCase().includes("delete"));
  if (deleteButton) deleteButton.click();
}


function showFloatingAlert() {
  if (document.getElementById("dontbite-alert")) return;

  const box = document.createElement("div");
  box.id = "dontbite-alert";
  box.innerHTML =`
    <strong>🚨 DONT BITE — Phishing Detected!</strong>
    <br>
    <button id="dontbite-action" style="margin-top: 10px; padding: 6px; font-size: 14px;">
      Catch the Phishing
    </button>
  `;
  box.style.cssText =` 
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: #8B0000;
    color: #fff;
    font-family: monospace;
    padding: 16px;
    border-radius: 10px;
    border: 2px solid #ff4c4c;
    box-shadow: 0 0 10px #ff0000;
  `;

  document.body.appendChild(box);

  document.getElementById("dontbite-action").onclick = async () => {
    chrome.runtime.sendMessage({ type: "open_report" });
  
    chrome.storage.local.get("phishingPolicy", (data) => {
      const policy = data.phishingPolicy || "default";
  
      if (policy !== "default") {
        alert(`⚠️The "${policy}" policy is not yet available in this version.`);
      }
    });
  };
  

  setTimeout(() => box.remove(), 15000); // Remove after 15s
} 



function checkForNewEmail() {
  const currentEmailId = getEmailId();
  console.log("🔍 Checking email ID:", currentEmailId);

  if (!currentEmailId || currentEmailId === lastEmailId) {
    console.log("⛔ Skipped — duplicate or invalid email");
    return;
  }

  lastEmailId = currentEmailId;

  const emailContent = getEmailBody();
  const sender = getSenderInfo();
  const subject = getEmailSubject();
  const links = extractHyperlinks();
  const attachments = getAttachmentInfo();
  const images = getImageSources();


  if (!emailContent) {
    console.log("⚠️ No email body found");
    return;
  }

  console.log("📤 Sending for analysis:", { sender, currentEmailId });

  chrome.runtime.sendMessage(
    {
      type: "analyze_email",
      content: emailContent,
      sender: sender,
      subject: subject,
      links: links,
      attachments: attachments,
      images: images
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Message send failed:", chrome.runtime.lastError);
        return;
      }
  
      console.log("📩 Background response:", response);
  
      // 👉 Trigger floating alert if phishing is detected
      if (response?.isPhishing) {
        showFloatingAlert();
      }
    }
  );  
}




// 🔁 MutationObserver to detect new emails in Gmail's SPA interface
const observer = new MutationObserver(() => {
  checkForNewEmail();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Run once at start
checkForNewEmail();

console.log("✅ DontBite content script loaded.");

const style = document.createElement("style");
style.textContent = `
@keyframes glitch {
  0%   { transform: translate(0px, 0px) rotate(0deg); }
  25%  { transform: translate(-1px, 1px) rotate(-1deg); }
  50%  { transform: translate(1px, -1px) rotate(1deg); }
  75%  { transform: translate(-1px, 1px) rotate(0deg); }
  100% { transform: translate(1px, -1px) rotate(-1deg); }
}
`;
document.head.appendChild(style);
