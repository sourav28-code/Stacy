// popup.js — final, stable
document.addEventListener("DOMContentLoaded", () => {
  const bootScreen = document.getElementById("bootScreen");
  const appContainer = document.getElementById("appContainer");
  const bootLines = document.querySelectorAll(".boot-line");
  const barFill = document.getElementById("barFill") || document.querySelector(".bar-fill");

  // Guard: if anything missing, don't crash — retry once
  if (!bootScreen || !appContainer || !bootLines) {
    console.warn("Essential DOM nodes missing — ensure index.html matches the expected structure.");
  }

  // sequential boot lines, then progress, then reveal app
  let i = 0;
  function bootSequence() {
    if (i < bootLines.length) {
      bootLines[i].classList.add("visible");
      i++;
      setTimeout(bootSequence, 600);
    } else {
      if (barFill) barFill.style.width = "100%";
      setTimeout(() => {
        bootScreen.classList.add("boot-hide");
        setTimeout(() => {
          bootScreen.style.display = "none";
          appContainer.classList.remove("hidden");
          appContainer.classList.add("active");
        }, 700);
      }, 900); // leave a small pause after bar fills
    }
  }

  bootSequence();
  // safety: ensure initStacy runs after the sequence (2500ms matches visual flow)
  setTimeout(initStacy, 2600);
});

// ---------------------------
// Main app logic
// ---------------------------
function initStacy() {
  console.log("✅ Stacy Online, Sir");

  // Elements
  const chatContainer = document.getElementById("chatContainer");
  const userInput = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const modeToggle = document.getElementById("modeToggle");

  // Operation mode
  let stacyMode = "active";

  // === API KEY: put your OpenRouter/OpenAI key here if you want real AI responses.
  // If left as null, the code will use a fast local mock (for testing).
  const OPENROUTER_KEY ="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"; // <-- REPLACE null with "sk-..." if you want live responses

  // Helper: append message bubble
  function addMessage(text, sender = "stacy") {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    msg.innerHTML = text;
    chatContainer.appendChild(msg);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return msg;
  }

  // Core: ask Stacy (uses OpenRouter if key set, else mock)
  async function askStacy(promptText) {
    // show user message & typing indicator
    addMessage(`<b>You:</b> ${escapeHtml(promptText)}`, "user");
    const typing = addMessage(`⏳ <i>Stacy is thinking...</i>`, "stacy");

    if (!OPENROUTER_KEY) {
      // Mock response path for instant testing
      await delay(600);
      typing.innerHTML = `<b>Stacy:</b> ${escapeHtml(mockReply(promptText))}`;
      return;
    }

    // Real API path (OpenRouter-compatible)
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                stacyMode === "active"
                  ? "You are Stacy — a confident, helpful red-gold AI assistant. Answer clearly and provide code blocks when asked to generate code."
                  : "You are Stacy in passive mode — short, calm, and concise.",
            },
            { role: "user", content: promptText },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("API error:", res.status, text);
        typing.innerHTML = `⚠️ Stacy: API error (${res.status}).`;
        return;
      }

      const data = await res.json();
      const message = (data.choices?.[0]?.message?.content) || "⚠️ No response.";
      // Replace typing with actual reply
      typing.innerHTML = `<b>Stacy:</b> ${escapeHtml(message)}`;
    } catch (err) {
      console.error("Network/API error", err);
      typing.innerHTML = "❌ Stacy: Connection error.";
    }
  }

  // Event handlers
  function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;
    userInput.value = "";
    askStacy(text);
  }
  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSend();
  });

  modeToggle.addEventListener("click", () => {
    stacyMode = stacyMode === "active" ? "passive" : "active";
    modeToggle.textContent = stacyMode === "active" ? "Active Mode" : "Passive Mode";
    modeToggle.style.background = stacyMode === "active"
      ? "linear-gradient(90deg, #ff2e2e, #f39c12)"
      : "linear-gradient(90deg, #00ccff, #0033ff)";
    addMessage(stacyMode === "active" ? "⚡ Stacy switched to Active Mode — systems online!" : "🌙 Stacy switched to Passive Mode — observation mode.", "stacy");
  });

  // small helpers
  function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

  function mockReply(text){
    // quick deterministic mock reply — replace or extend as you like
    if (/code|program|c language|c program|python/i.test(text)) {
      return "I can generate code. Try: 'Write a C program to check leap year'.";
    }
    if (/price|compare|amazon|flipkart/i.test(text)) {
      return "I can compare prices across sites in Active Mode (tab access required).";
    }
    return "Acknowledged — I'm ready. (Set OPENROUTER_KEY in popup.js to enable live responses.)";
  }

  // small sanitizer for innerHTML insertion (keeps messages readable)
  function escapeHtml(s){
    if (!s) return "";
    return s
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }
}
