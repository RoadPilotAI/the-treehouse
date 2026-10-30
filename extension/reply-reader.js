// One assistant response element = one plain-text Treehouse message.
(() => {
  const platform=location.hostname==="gemini.google.com"?"gemini":"gpt";
  function replies(){
    if(platform==="gemini")
      return [...document.querySelectorAll("model-response")].filter(el=>el.getClientRects().length);
    // ChatGPT commonly nests the author marker within a conversation turn;
    // accept either the author-marked element or its enclosing turn, without
    // assuming that the marker itself has a measurable layout rectangle.
    const marked=[...document.querySelectorAll('[data-message-author-role="assistant"]')];
    if(marked.length)return marked;
    // A narrower fallback than "all turns": only explicitly assistant-labelled turns.
    return [...document.querySelectorAll(
      '[data-testid^="conversation-turn-"][data-turn="assistant"], article[data-turn="assistant"]'
    )];
  }
  function snapshot(){
    const all=replies(),el=all.at(-1);
    if(!el){
      return {count:0,text:"",diagnostic: platform==="gpt" ? {
        authorMarkers:document.querySelectorAll("[data-message-author-role]").length,
        conversationTurns:document.querySelectorAll('[data-testid^="conversation-turn-"]').length,
        assistantTurns:document.querySelectorAll('[data-turn="assistant"]').length
      }:undefined};
    }
    const body=platform==="gemini"
      ?el.querySelector(".model-response-text, message-content, .markdown")||el
      :el.querySelector(".markdown, [data-message-content], .prose")||el;
    return {count:all.length,text:(body.innerText||body.textContent||"").trim()};
  }
  chrome.runtime.onMessage.addListener((request,_sender,respond)=>{
    if(request?.type==="TREEHOUSE_READ_ASSISTANT_REPLY")respond(snapshot());
  });
})();
