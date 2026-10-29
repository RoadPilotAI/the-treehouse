// Sketch of protocol state: NOT wired to the browser extension yet.
// These human-readable conventions do not grant authority to send messages.
const TURN = Object.freeze({ OVER: "OVER", OUT: "OUT", ACK: "ACK" });
const MAX_TURNS = 2; // One outbound message and one return message.
function canAdvance({ turns, stopped, authorized }) {
  return authorized === true && stopped !== true && Number.isInteger(turns) && turns >= 0 && turns < MAX_TURNS;
}
// When activated later, the extension must enforce the counter independently of model text.
