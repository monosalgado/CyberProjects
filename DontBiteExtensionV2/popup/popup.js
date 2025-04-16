// popup.js

document.addEventListener("DOMContentLoaded", async () => {
  // UI Elements
  const apiStatusEl = document.getElementById("api-status");
  const emailsAnalyzedEl = document.getElementById("emails-analyzed");
  const threatsDetectedEl = document.getElementById("threats-detected");
  const alertBoxEl = document.getElementById("alert-box");

  // Load stats from local storage
  chrome.storage.local.get(
    ["emailsAnalyzed", "threatsDetected", "lastEmailThreat"],
    (data) => {
      emailsAnalyzedEl.textContent = data.emailsAnalyzed || 0;
      threatsDetectedEl.textContent = data.threatsDetected || 0;

      if (data.lastEmailThreat) {
        alertBoxEl.classList.remove("hidden");
      }
    }
  );

  // Optionally check Gemini API connectivity by making a test request
  checkGeminiConnection().then((working) => {
    apiStatusEl.textContent = working ? "✅ Working" : "❌ Error";
    apiStatusEl.style.color = working ? "#00ff88" : "#ff4c4c";
  });
  const policySelect = document.getElementById("policy-select");
  const togglePolicyBtn = document.getElementById("toggle-policy");
  const policySection = document.getElementById("policy-section");

  togglePolicyBtn.addEventListener("click", () => {
    const isVisible = policySection.style.display === "block";
    policySection.style.display = isVisible ? "none" : "block";
    togglePolicyBtn.textContent = isVisible ? "⚙️ Show Policy Settings" : "⚙️ Hide Policy Settings";
  });

  // Load saved policy
  chrome.storage.local.get("phishingPolicy", (data) => {
    policySelect.value = data.phishingPolicy || "default";
  });

  // Save policy on change
  policySelect.addEventListener("change", () => {
    const selected = policySelect.value;
    chrome.storage.local.set({ phishingPolicy: selected }, () => {
      console.log("✅ Policy updated to:", selected);
    });
  });

});

async function checkGeminiConnection() {
  try {
    const API_KEY = "AIzaSyAkwGLBRffH2EoRM70g4tapSKJ0VAgNnGA";
    const testURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(testURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Say OK if you received this prompt." }]
          }
        ]
      })
    });

    const json = await response.json();
    const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase();
    return reply?.includes("ok");
  } catch (err) {
    console.error("Gemini test failed:", err);
    return false;
  }
}

