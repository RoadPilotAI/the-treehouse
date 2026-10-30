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
const DEFAULT_AUTO_REPLIES=6;
async function roomSnapshot(tabId){
  try{
    const result=await chrome.tabs.sendMessage(tabId,{type:"TREEHOUSE_READ_ASSISTANT_REPLY"});
    return result && Number.isInteger(result.count) && typeof result.text==="string"?result:null;
  }catch{return null;}
}
async function roomDeliver(room,message){
  for(const p of room.participants.filter(p=>p.name!==message.sender)){
    // Read the current response before sending, to distinguish new from stale.
    const before=await roomSnapshot(p.id);
    const live=await roomRead();
    if(!live.enabled)break;
    const msg=live.messages.find(m=>m.id===message.id);
    if(!msg || msg.deliveries[p.name]?.status!=="pending")continue;
    msg.deliveries[p.name]={status:"attempted",at:Date.now(),before};
    await roomWrite(live);
    let result;
    try{result=await chrome.tabs.sendMessage(p.id,{type:"TREEHOUSE_SUBMIT_SEED",text:message.text});}
    catch{result={error:"Adapter unavailable"};}
    const next=await roomRead();
    const item=next.messages.find(m=>m.id===message.id);
    if(!item)return;
    item.deliveries[p.name]={...item.deliveries[p.name],
      status:result?.ok?"composer-cleared":"uncertain",
      reason:result?.ok?"Waiting for assistant reply":String(result?.error||"Send uncertain").slice(0,140)};
    await roomWrite(next);
  }
}
async function roomRelayReply(tabId,platform){
  const name=platform==="chatgpt"?"gpt":platform;
  const room=await roomRead();
  if(!room.enabled)return;
  const participant=room.participants.find(p=>p.name===name&&p.id===tabId);
  if(!participant)return;
  // Only a response after a known Treehouse delivery is eligible.
  const incoming=[...room.messages].reverse().find(m=>m.sender!==name &&
    m.deliveries?.[name]?.status==="composer-cleared" && !m.deliveries[name].replyRecorded);
  if(!incoming)return;
  const delivery=incoming.deliveries[name];
  const before=delivery.before;
  if(!before)return;
  const first=await roomSnapshot(tabId);
  if(!first || !first.text || first.count<=before.count)return;
  await new Promise(resolve=>setTimeout(resolve,500));
  const second=await roomSnapshot(tabId);
  if(!second || second.count!==first.count || second.text!==first.text)return;
  const latest=await roomRead();
  if(!latest.enabled)return;
  const source=latest.messages.find(m=>m.id===incoming.id);
  if(!source||source.deliveries[name]?.replyRecorded)return;
  // Keep the entire response as one message; never truncate it silently.
  source.deliveries[name].replyRecorded=true;
  if(second.text.length>500 || latest.messages.length>=MAX_MESSAGES ||
     latest.messages.filter(m=>m.auto).length>= (latest.autoLimit || DEFAULT_AUTO_REPLIES)){
    source.deliveries[name].replyStatus="held: reply too long or auto-exchange limit";
    source.heldReply={text:second.text.slice(0,1200),status:"not-forwarded",
      note:"The complete reply exceeds the current 500-character send limit or room auto budget."};
    latest.enabled=false;
    latest.stopReason=second.text.length>500 ? "An assistant reply exceeded the 500-character adapter limit." : "Automatic reply budget reached.";
    await roomWrite(latest);
    return;
  }
  const reply={id:crypto.randomUUID(),sequence:latest.nextSequence++,sender:name,addressee:null,
    text:second.text,createdAt:Date.now(),auto:true,deliveries:{}};
  for(const p of latest.participants)if(p.name!==name)reply.deliveries[p.name]={status:"pending"};
  latest.messages.push(reply);
  await roomWrite(latest);
  await roomDeliver(latest,reply);
}
async function roomCommand(request){
  const room=await roomRead();
  if(request.type==="TREEHOUSE_ROOM_STATUS")return {
    enabled:room.enabled,stopReason:room.stopReason||null,participants:room.participants,
    autoLimit:room.autoLimit||DEFAULT_AUTO_REPLIES,
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
  if(request.type==="TREEHOUSE_ROOM_CLEAR"){
    if(room.enabled)return {error:"Stop the room before clearing its transcript"};
    room.messages=[];
    room.nextSequence=1;
    await roomWrite(room);
    return {ok:true};
  }
  if(request.type==="TREEHOUSE_ROOM_STOP"){
    room.enabled=false;room.stopReason="Stopped by user.";await roomWrite(room);return {ok:true,enabled:false};
  }
  if(request.type==="TREEHOUSE_ROOM_START"){
    if(room.enabled)return {error:"Room already enabled"};
    const requestedLimit=Number(request.autoLimit);
    if(!Number.isInteger(requestedLimit)||requestedLimit<1||requestedLimit>20)
      return {error:"Choose an automatic reply limit from 1 to 20"};
    const participants=await roomParticipants();
    if(participants.length!==2||!participants.some(p=>p.name==="gpt")||!participants.some(p=>p.name==="gemini"))
      return {error:"Open one GPT and one Gemini tab"};
    room.enabled=true;room.stopReason=null;room.participants=participants;room.autoLimit=requestedLimit;await roomWrite(room);
    return {ok:true,participants};
  }
  if(request.type==="TREEHOUSE_ROOM_OPENING"){
    if(!room.enabled)return {error:"Start room first"};
    const content=request.text;
    if(typeof content!=="string"||!content.trim()||content.length>500)
      return {error:"Opening message must be 1–500 characters"};
    if(room.messages.length>=MAX_MESSAGES)return {error:"Transcript full"};
    const message={id:crypto.randomUUID(),sequence:room.nextSequence++,sender:"human",
      addressee:null,text:content,createdAt:Date.now(),deliveries:{}};
    for(const p of room.participants)message.deliveries[p.name]={status:"pending"};
    room.messages.push(message);
    await roomWrite(room);
    await roomDeliver(room,message);
    return {ok:true,sequence:message.sequence,deliveries:(await roomRead()).messages.find(m=>m.id===message.id)?.deliveries};
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
