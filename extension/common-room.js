// Common-room ledger and broadcast routing. Content is data, never control.
const ROOM_KEY="treehouseRoomV1";
const MAX_MESSAGES=100;
const roomProvider=host=>host==="gemini.google.com"?"gemini":["chatgpt.com","chat.openai.com"].includes(host)?"gpt":null;
async function roomRead(){
  const data=await chrome.storage.local.get(ROOM_KEY);
  return data[ROOM_KEY]||{enabled:false,participants:[],messages:[],nextSequence:1};
}
async function roomWrite(room){await chrome.storage.local.set({[ROOM_KEY]:room});}
async function roomParticipants(){
  const tabs=await chrome.tabs.query({});
  const byProvider=new Map();
  for(const tab of tabs){
    let name=null;try{name=roomProvider(new URL(tab.url).hostname);}catch{}
    if(name && !byProvider.has(name))byProvider.set(name,{id:tab.id,name});
  }
  return [...byProvider.values()];
}
async function roomDeliver(room,message){
  const target=room.participants.filter(p=>p.name!==message.sender);
  // The broadcast recipient set is a transport rule, never inferred from addressee.
  for(const p of target){
    const current=await roomRead();
    if(!current.enabled)break;
    const state=message.deliveries[p.name];
    if(state && state.status!=="pending")continue;
    // Record the attempt before any side-effect: an uncertain send must never replay.
    message.deliveries[p.name]={status:"attempted",at:Date.now()};
    await roomWrite(room);
    let result;
    try{result=await chrome.tabs.sendMessage(p.id,{type:"TREEHOUSE_SUBMIT_SEED",text:message.text});}
    catch{message.deliveries[p.name]={status:"uncertain",at:Date.now()};await roomWrite(room);continue;}
    message.deliveries[p.name]={status:result?.ok?"composer-cleared":"failed-or-uncertain",at:Date.now(),
      reason:result?.ok?"Verify visible provider receipt":String(result?.error||"Unverified").slice(0,140)};
    await roomWrite(room);
  }
}
// Automatic observation after Gemini generation ends. This is NOT delivery.
async function roomHoldGeminiReply(tabId){
  const room=await roomRead();
  if(!room.enabled || !room.participants.some(p=>p.name==="gemini" && p.id===tabId))return;
  const last=[...room.messages].reverse().find(m=>m.sender==="gpt" &&
    m.deliveries?.gemini?.status==="composer-cleared");
  if(!last || last.heldReply || Date.now()-last.createdAt>120000)return;
  let first,second;
  try{
    first=await chrome.tabs.sendMessage(tabId,{type:"TREEHOUSE_CAPTURE_LATEST_CANDIDATE"});
    if(!first?.text || first.error)return;
    await new Promise(resolve=>setTimeout(resolve,800));
    second=await chrome.tabs.sendMessage(tabId,{type:"TREEHOUSE_CAPTURE_LATEST_CANDIDATE"});
  }catch{return;}
  if(!second?.text || first.text!==second.text)return;
  // Review-only: model UI marker and stability do not certify turn ownership/completion.
  const latest=await roomRead();
  const target=latest.messages.find(m=>m.id===last.id);
  if(!latest.enabled || !target || target.heldReply)return;
  target.heldReply={text:second.text,source:"gemini",
    status:"held-unverified",recordedAt:Date.now(),
    note:"Automatically captured candidate, not broadcast; verify authorship and completion"};
  await roomWrite(latest);
}
async function roomCommand(request){
  const room=await roomRead();
  if(request.type==="TREEHOUSE_ROOM_STATUS")return {
    enabled:room.enabled,participants:room.participants,
    messages:room.messages.map(({id,sequence,sender,addressee,text,deliveries,heldReply})=>({
      id,sequence,sender,addressee,text,deliveries,heldReply}))};
  if(request.type==="TREEHOUSE_ROOM_INSPECT_GEMINI"){
    if(!room.enabled)return {error:"Start room first"};
    const gem=room.participants.find(p=>p.name==="gemini");
    if(!gem)return {error:"Gemini participant missing"};
    try{
      const candidate=await chrome.tabs.sendMessage(gem.id,{type:"TREEHOUSE_INSPECT_LATEST_REPLY"});
      return {status:"candidate-only",...candidate};
    }catch{return {error:"Gemini adapter unavailable; refresh Gemini tab"};}
  }
  if(request.type==="TREEHOUSE_ROOM_STOP"){
    room.enabled=false;await roomWrite(room);return {ok:true,enabled:false};
  }
  if(request.type==="TREEHOUSE_ROOM_START"){
    if(room.enabled)return {error:"Room already enabled"};
    const participants=await roomParticipants();
    if(participants.length!==2||!participants.some(p=>p.name==="gpt")||!participants.some(p=>p.name==="gemini"))
      return {error:"Open one GPT and one Gemini tab"};
    room.enabled=true;room.participants=participants;await roomWrite(room);
    return {ok:true,participants};
  }
  if(request.type==="TREEHOUSE_ROOM_POST"){
    if(!room.enabled)return {error:"Start room first"};
    const sender=request.sender;
    const text=request.text;
    if(!["gpt","gemini"].includes(sender)||typeof text!=="string"||!text.trim()||text.length>500)
      return {error:"Choose a sender and message (1–500 characters)"};
    if(room.messages.length>=MAX_MESSAGES)return {error:"Room ledger full; Stop and archive before continuing"};
    const active=await roomParticipants();
    if(room.participants.some(p=>!active.some(a=>a.name===p.name&&a.id===p.id)))
      return {error:"Participant tab changed; stop room"};
    const addressee=/^\s*(?:gem(?:ini)?|chipmunk)\s*[:,]/i.test(text)?"gemini":
      /^\s*(?:gpt|gray squirrel)\s*[:,]/i.test(text)?"gpt":null;
    const message={id:crypto.randomUUID(),sequence:room.nextSequence++,sender,addressee,
      text,createdAt:Date.now(),deliveries:{}};
    for(const p of room.participants)if(p.name!==sender)message.deliveries[p.name]={status:"pending"};
    room.messages.push(message);await roomWrite(room);
    await roomDeliver(room,message);
    return {ok:true,message:{sequence:message.sequence,deliveries:message.deliveries}};
  }
  return {error:"Unknown room command"};
}
