import type { CommunityMessage } from "@/types/pulse";

type Subscriber = (event: { type: "message" | "presence"; payload: CommunityMessage | { online: number } }) => void;
type RoomSubscriber = { fixtureId: number; subscriber: Subscriber };
type ChatState = { messages: CommunityMessage[]; subscribers: Set<RoomSubscriber>; signatures: string[] };

const globalChat = globalThis as typeof globalThis & { __pulseProofChat?: ChatState };
const state = globalChat.__pulseProofChat ?? { messages: [], subscribers: new Set<RoomSubscriber>(), signatures: [] };
globalChat.__pulseProofChat = state;

const BLOCKED_PATTERNS = [
  /https?:\/\//i,
  /\b(?:bet|wager|casino|airdrop|seed phrase|private key)\b/i,
  /\b(?:idiot|stupid|hate)\b/i,
];

export function validateChatText(value: string) {
  const body = value.replace(/\s+/g, " ").trim();
  if (body.length < 1 || body.length > 280) throw new Error("Message must contain 1 to 280 characters");
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(body))) {
    throw new Error("Links, wagering, wallet secrets and abusive language are not allowed");
  }
  const repeated = /(.)\1{9,}/u.test(body);
  if (repeated) throw new Error("Repeated-character spam is not allowed");
  return body;
}

export function addCommunityMessage(input: Omit<CommunityMessage, "id" | "createdAt">) {
  const message: CommunityMessage = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  state.messages.push(message);
  const roomMessages = state.messages.filter((item) => item.fixtureId === message.fixtureId);
  for (const expired of roomMessages.slice(0, Math.max(0, roomMessages.length - 50))) {
    const index = state.messages.findIndex((item) => item.id === expired.id);
    if (index >= 0) state.messages.splice(index, 1);
  }
  if (state.messages.length > 500) state.messages.splice(0, state.messages.length - 500);
  for (const room of state.subscribers) {
    if (room.fixtureId === message.fixtureId) room.subscriber({ type: "message", payload: message });
  }
  return message;
}

export function getCommunityMessages(fixtureId: number) {
  return state.messages.filter((message) => message.fixtureId === fixtureId);
}

export function subscribeToCommunityChat(fixtureId: number, subscriber: Subscriber) {
  const room = { fixtureId, subscriber };
  state.subscribers.add(room);
  broadcastPresence(fixtureId);
  return () => {
    state.subscribers.delete(room);
    broadcastPresence(fixtureId);
  };
}

export function communityOnlineCount(fixtureId: number) {
  return [...state.subscribers].filter((room) => room.fixtureId === fixtureId).length;
}

function broadcastPresence(fixtureId: number) {
  const payload = { online: communityOnlineCount(fixtureId) };
  for (const room of state.subscribers) {
    if (room.fixtureId === fixtureId) room.subscriber({ type: "presence", payload });
  }
}

export function consumeChatSignature(signature: string) {
  if (state.signatures.includes(signature)) throw new Error("This signed chat message was already used");
  state.signatures.push(signature);
  if (state.signatures.length > 200) state.signatures.splice(0, state.signatures.length - 200);
}

export function resetCommunityChatForTests() {
  state.messages.length = 0;
  state.subscribers.clear();
  state.signatures.length = 0;
}
