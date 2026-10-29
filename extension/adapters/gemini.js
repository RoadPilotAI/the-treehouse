// Read-only probe. No chat content is collected or transmitted.
(() => {
  const platform = "gemini";
  const host = location.hostname;
  const probe = () => ({
    platform,
    host,
    // Selectors are hypotheses to validate against the live interface.
    inputPresent: Boolean(document.querySelector('[contenteditable="true"][role="textbox"], rich-textarea [contenteditable="true"], textarea')),
    urlMatched: host === "gemini.google.com"
  });
  chrome.runtime.onMessage.addListener((request, _sender, respond) => {
    if (request?.type === "TREEHOUSE_STATUS") respond(probe());
  });
  chrome.runtime.sendMessage({ type: "TREEHOUSE_PROBE", platform, host }).catch(() => {});
})();
