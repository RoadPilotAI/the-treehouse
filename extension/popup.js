const results = document.querySelector("#results");
const hosts = new Set(["chatgpt.com", "chat.openai.com", "gemini.google.com"]);
async function scan() {
  results.replaceChildren();
  const tabs = await chrome.tabs.query({});
  const targets = tabs.filter(t => { try { return hosts.has(new URL(t.url).hostname); } catch { return false; } });
  if (!targets.length) { const li = document.createElement("li"); li.textContent = "No supported tabs detected."; results.append(li); return; }
  for (const tab of targets) {
    const li = document.createElement("li");
    try {
      const status = await chrome.tabs.sendMessage(tab.id, { type: "TREEHOUSE_STATUS" });
      li.textContent = status.platform + ": " + (status.inputPresent ? "input detected" : "input not detected") + " (tab " + tab.id + ")";
    } catch {
      li.textContent = "Tab " + tab.id + ": adapter unavailable; refresh this tab after loading the extension.";
    }
    results.append(li);
  }
}
document.querySelector("#scan").addEventListener("click", scan);
scan();
