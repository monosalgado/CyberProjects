// background.js
// scripts/background.js
import {analyzeEmailWithGemini} from "../utils/geminiClient.js";


const API_KEY = "AIzaSyAkwGLBRffH2EoRM70g4tapSKJ0VAgNnGA"; // Replace this with your actual key
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + API_KEY;

// Track stats
let stats = {
  emailsAnalyzed: 0,
  threatsDetected: 0
};

// On install/init: load stats from storage
chrome.runtime.onStartup.addListener(loadStats);
chrome.runtime.onInstalled.addListener(loadStats);

function loadStats() {
  chrome.storage.local.get(["emailsAnalyzed", "threatsDetected"], (data) => {
    stats.emailsAnalyzed = data.emailsAnalyzed || 0;
    stats.threatsDetected = data.threatsDetected || 0;
  });
}

// Listen for email analysis requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "analyze_email") {
    const {
      content,
      sender,
      subject,
      links,
      attachments,
      images
    } = message;       

    analyzeEmailWithGemini(content, sender, subject, links, attachments, images).then((isPhishing) => {
      stats.emailsAnalyzed++;
      if (isPhishing) stats.threatsDetected++;
    
      // Always store basic stats
      const baseStorage = {
        emailsAnalyzed: stats.emailsAnalyzed,
        threatsDetected: stats.threatsDetected,
        lastEmailThreat: isPhishing
      };
    
      // If phishing, store report details
      if (isPhishing) {
        Object.assign(baseStorage, {
          lastSender: {
            name: sender.senderName,
            email: sender.senderEmail
          },
          lastSubject: subject,
          lastLinks: links,
          lastAttachments: attachments
        });
      }
    
      chrome.storage.local.set(baseStorage);
      sendResponse({ status: "done", isPhishing });
    });
    

    // Return true to indicate async response
    return true;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "open_report") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup/phishing_report.html")
    });
  }
});





