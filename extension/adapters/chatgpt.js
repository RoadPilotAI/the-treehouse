// Read-only probe. No chat content is collected or transmitted.
(() => {
  const platform = "chatgpt";
  const host = location.hostname;
  const probe = () => ({
    platform,
    host,
    // These are candidates, not guaranteed stable selectors.
    inputPresent: Boolean(document.querySelector('[contenteditable="true"][role="textbox"], #prompt-textarea, textarea')),
    urlMatched: ["chatgpt.com", "chat.openai.com"].includes(host)
  });
  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
