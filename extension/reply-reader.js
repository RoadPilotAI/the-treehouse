// One assistant response element = one plain-text Treehouse message.
(() => {
  const platform=location.hostname==="gemini.google.com"?"gemini":"gpt";
  function replies(){
    if(platform==="gemini")
      return [...document.querySelectorAll("model-response")].filter(el=>el.getClientRects().length);
    // Current ChatGPT markup: heading identifies speaker; its parent is one turn.
    const headings=[...document.querySelectorAll('h4[data-conversation-role="assistant"]')];
    return headings.map(h=>h.parentElement).filter(Boolean);

  }
  function snapshot(){
    const all=replies(),el=all.at(-1);
    if(!el){
      return {count:0,text:"",diagnostic: platform==="gpt" ? {
        authorMarkers:document.querySelectorAll("[data-message-author-role]").length,
        conversationTurns:document.querySelectorAll('[data-testid^="conversation-turn-"]').length,
        assistantTurns:document.querySelectorAll('h4[data-conversation-role="assistant"]').length
      }:undefined};
    }
    const body=platform==="gemini"
      ?el.querySelector(".model-response-text, message-content, .markdown")||el
      :el.querySelector(".markdown, [data-message-content], .prose")||el;
    const text=platform==="gpt" && body===el
      ? [...el.children].filter(child=>child!==el.querySelector('h4[data-conversation-role="assistant"]')).map(child=>child.innerText||"").join("\n").trim()
      : (body.innerText||body.textContent||"").trim();
    return {count:all.length,text};
  }
  chrome.runtime.onMessage.addListener((request,_sender,respond)=>{
    if(request?.type==="TREEHOUSE_READ_ASSISTANT_REPLY")respond(snapshot());
  });
})();
