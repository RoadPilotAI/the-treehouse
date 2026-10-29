const results = document.querySelector("#results");
const extraction = document.querySelector("#extraction");
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
      const title = document.createElement("span");
      title.textContent = status.platform + ": " + (status.inputPresent ? "input detected" : "input not detected") + " (tab " + tab.id + ") ";
      li.append(title);
      const button = document.createElement("button");
      button.textContent = "Extract selected";
      button.addEventListener("click", () => extract(tab.id, status.platform));
      li.append(button);
      if (status.platform === "chatgpt") {
        const inspectButton = document.createElement("button");
        inspectButton.textContent = "Inspect selection";
        inspectButton.addEventListener("click", () => inspect(tab.id));
        li.append(inspectButton);
      }
    } catch {
      li.textContent = "Tab " + tab.id + ": adapter unavailable; refresh this tab after loading the extension.";
    }
    results.append(li);
  }
}
async function extract(tabId, platform) {
  extraction.replaceChildren();
  const p = document.createElement("p");
  extraction.append(p);
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: "TREEHOUSE_EXTRACT_SELECTED" });
    if (!result || result.error) { p.textContent = (result && result.error) || "No response from adapter."; return; }
    p.textContent = platform + " — selected excerpt (" + result.text.length + " characters). Completion NOT verified.";
    const pre = document.createElement("pre");
    pre.textContent = result.text; // Text-only: never interpret selected content as HTML.
    extraction.append(pre);
    const note = document.createElement("small");
    note.textContent = result.warning;
    extraction.append(note);
  } catch { p.textContent = "Adapter unavailable; refresh the target tab and retry."; }
}
async function inspect(tabId) {
  extraction.replaceChildren();
  const pre = document.createElement("pre");
  extraction.append(pre);
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: "TREEHOUSE_INSPECT_SELECTION" });
    pre.textContent = JSON.stringify(result, null, 2);
  } catch {
    pre.textContent = "Adapter unavailable. Refresh the tab and retry.";
  }
}
document.querySelector("#scan").addEventListener("click", scan);
scan();
