// One chat response element = one plain-text Treehouse message.
(() => {
  const platform=location.hostname==="gemini.google.com"?"gemini":"gpt";
  function replies(){
    const selector=platform==="gemini"?"model-response":"[data-message-author-role='assistant']";
    return [...document.querySelectorAll(selector)].filter(el=>el.getClientRects().length);
  }
  function snapshot(){
    const all=replies();
    const el=all.at(-1);
    if(!el)return {count:0,text:""};
    // Prefer answer content over toolbars and buttons; preserve ordinary paragraphs.
    const body=platform==="gemini"
      ?el.querySelector(".model-response-text, message-content, .markdown")||el
      :el.querySelector(".markdown, [data-message-content], .prose")||el;
    const text=(body.innerText||"").trim();
    return {count:all.length,text};
  }
  chrome.runtime.onMessage.addListener((request,_sender,respond)=>{
    if(request?.type==="TREEHOUSE_READ_ASSISTANT_REPLY")respond(snapshot());
  });
})();
