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
      button.textContent = "Capture selection";
      button.addEventListener("click", () => extract(tab.id, status.platform));
      li.append(button);
      if (status.platform === "chatgpt") {
        const inspectButton = document.createElement("button");
        inspectButton.textContent = "Inspect selection";
        inspectButton.addEventListener("click", () => inspect(tab.id));
        li.append(inspectButton);
        const geometryButton = document.createElement("button");
        geometryButton.textContent = "Inspect geometry";
        geometryButton.addEventListener("click", () => inspect(tab.id, "TREEHOUSE_INSPECT_GEOMETRY"));
        li.append(geometryButton);
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
    p.textContent = platform + " — user-selected text (" + result.text.length + " characters). Authorship/completion NOT verified.";
    const pre = document.createElement("pre");
    pre.textContent = result.text; // Text-only: never interpret selected content as HTML.
    extraction.append(pre);
    const note = document.createElement("small");
    note.textContent = result.warning;
    extraction.append(note);
    const options = document.createElement("div");
    extraction.append(options);
    const tabs = await chrome.tabs.query({});
    const targets = tabs.filter(t => t.id !== tabId && (() => {
      try { return hosts.has(new URL(t.url).hostname); } catch { return false; }
    })());
    if (!targets.length) {
      const none = document.createElement("p");
      none.textContent = "No other supported destination tab is open.";
      options.append(none);
    }
    for (const target of targets) {
      const b = document.createElement("button");
      const dest = new URL(target.url).hostname === "gemini.google.com" ? "Gemini" : "ChatGPT";
      b.textContent = "Prepare draft in " + dest + " (tab " + target.id + ")";
      b.addEventListener("click", async () => {
        b.disabled = true;
        try {
          const answer = await chrome.tabs.sendMessage(target.id,
            { type: "TREEHOUSE_PREPARE_DRAFT", text: result.text });
          p.textContent = answer?.ok
            ? "Draft prepared in " + dest + ". Nothing was sent. Switch tabs and review."
            : answer?.reviewRequired
              ? "Draft is present in " + dest + ", but exact text verification failed. Review it before sending; do not click Prepare again."
              : ((answer?.error || "Destination rejected draft.") + (answer?.diagnostic ? "\nComposer diagnostic (no message text): " + JSON.stringify(answer.diagnostic) : ""));
          if (answer?.ok || answer?.reviewRequired) await chrome.tabs.update(target.id, { active: true });
        } catch {
          p.textContent = "Destination adapter unavailable; refresh target tab.";
        }
        b.disabled = false;
      });
      options.append(b);
    }
  } catch { p.textContent = "Adapter unavailable; refresh the target tab and retry."; }
}
async function inspect(tabId, type = "TREEHOUSE_INSPECT_SELECTION") {
  extraction.replaceChildren();
  const pre = document.createElement("pre");
  extraction.append(pre);
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type });
    pre.textContent = JSON.stringify(result, null, 2);
  } catch {
    pre.textContent = "Adapter unavailable. Refresh the tab and retry.";
  }
}
document.querySelector("#scan").addEventListener("click", scan);
scan();


const seedDestination = document.querySelector("#seed-destination");
const seedStatus = document.querySelector("#seed-status");
async function refreshSeedControls() {
  const tabs = await chrome.tabs.query({});
  const destinations = tabs.filter(tab => {
    try { return hosts.has(new URL(tab.url).hostname); } catch { return false; }
  });
  const previous = seedDestination.value;
  seedDestination.replaceChildren();
  for (const tab of destinations) {
    const option = document.createElement("option");
    option.value = String(tab.id);
    option.textContent = (new URL(tab.url).hostname === "gemini.google.com" ? "Gemini" : "ChatGPT") + " (tab " + tab.id + ")";
    seedDestination.append(option);
  }
  if (destinations.some(tab => String(tab.id) === previous)) seedDestination.value = previous;
  const state = await chrome.runtime.sendMessage({ type: "TREEHOUSE_SESSION_STATUS" });
  seedStatus.textContent = state.state + (state.reason ? " — " + state.reason : "") + (state.diagnostic ? "\nDiagnostic: " + JSON.stringify(state.diagnostic, null, 2) : "");
}
document.querySelector("#seed-start").addEventListener("click", async () => {
  const destinationTabId = Number(seedDestination.value);
  const seed = document.querySelector("#seed-text").value;
  const tabs = await chrome.tabs.query({});
  const destination = tabs.find(t => t.id === destinationTabId);
  const destinationProvider = destination && new URL(destination.url).hostname === "gemini.google.com" ? "gemini" : "chatgpt";
  const source = tabs.find(t => t.id !== destinationTabId && (() => {
    try {
      const h = new URL(t.url).hostname;
      return destinationProvider === "gemini" ? ["chatgpt.com", "chat.openai.com"].includes(h) : h === "gemini.google.com";
    } catch { return false; }
  })());
  if (!source) { seedStatus.textContent = "Open the other provider in a second tab."; return; }
  if (!window.confirm("Start a bounded session and attempt to SEND one harmless test message to the selected tab?")) return;
  seedStatus.textContent = "Attempting one authorized seed…";
  try {
    const response = await chrome.runtime.sendMessage({
      type: "TREEHOUSE_SESSION_START", sourceTabId: source.id, destinationTabId, seed
    });
    seedStatus.textContent = (response.error || (response.state + " — " + (response.reason || "seed attempted"))) + (response.diagnostic ? "\nDiagnostic: " + JSON.stringify(response.diagnostic, null, 2) : "");
    await chrome.tabs.update(destinationTabId, { active: true });
  } catch { seedStatus.textContent = "Unable to contact coordinator. No retry attempted."; }
});
document.querySelector("#seed-stop").addEventListener("click", async () => {
  try {
    const result = await chrome.runtime.sendMessage({ type: "TREEHOUSE_SESSION_STOP" });
    seedStatus.textContent = result.state + " — " + (result.reason || "");
  } catch { seedStatus.textContent = "Stop request failed; reload extension and inspect destination."; }
});
refreshSeedControls().catch(() => { seedStatus.textContent = "Coordinator unavailable."; });


const roomStatus=document.querySelector("#room-status");
const roomTranscript=document.querySelector("#room-transcript");
async function roomRefresh(){
  const state=await chrome.runtime.sendMessage({type:"TREEHOUSE_ROOM_STATUS"});
  roomStatus.textContent=state.enabled?"Room open":"Room stopped";
  roomTranscript.replaceChildren();
  for(const msg of state.messages||[]){
    const p=document.createElement("p");
    const head=document.createElement("strong");
    head.textContent="#"+msg.sequence+" "+msg.sender.toUpperCase()+" → "+
      (msg.addressee||"all")+" (broadcast to others)";
    const content=document.createElement("div");
    content.textContent=msg.text;
    const details=document.createElement("small");
    details.textContent=JSON.stringify(msg.deliveries);
    p.append(head,content,details);
    roomTranscript.append(p);
  }
}
document.querySelector("#room-start").addEventListener("click",async()=>{
  roomStatus.textContent=JSON.stringify(await chrome.runtime.sendMessage({type:"TREEHOUSE_ROOM_START"}));
  await roomRefresh();
});
document.querySelector("#room-stop").addEventListener("click",async()=>{
  roomStatus.textContent=JSON.stringify(await chrome.runtime.sendMessage({type:"TREEHOUSE_ROOM_STOP"}));
});
document.querySelector("#room-post").addEventListener("click",async()=>{
  const sender=document.querySelector("#room-sender").value;
  const text=document.querySelector("#room-text").value;
  if(!window.confirm("Broadcast this test message from "+sender+" to every OTHER participant? It will submit to the provider."))return;
  const result=await chrome.runtime.sendMessage({type:"TREEHOUSE_ROOM_POST",sender,text});
  roomStatus.textContent=JSON.stringify(result);
  if(result.ok)document.querySelector("#room-text").value="";
  await roomRefresh();
});
document.querySelector("#room-refresh").addEventListener("click",roomRefresh);
roomRefresh().catch(()=>{roomStatus.textContent="Room coordinator unavailable";});
