import type { CommunityMessage } from "@/types/pulse";

type Subscriber = (event: { type: "message" | "presence"; payload: CommunityMessage | { online: number } }) => void;
type ChatState = { messages: CommunityMessage[]; subscribers: Set<Subscriber> };

const globalChat = globalThis as typeof globalThis & { __pulseProofChat?: ChatState };
const state = globalChat.__pulseProofChat ?? { messages: [], subscribers: new Set<Subscriber>() };
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
  if (state.messages.length > 50) state.messages.splice(0, state.messages.length - 50);
  for (const subscriber of state.subscribers) subscriber({ type: "message", payload: message });
  return message;
}

export function getCommunityMessages() {
  return [...state.messages];
}

export function subscribeToCommunityChat(subscriber: Subscriber) {
  state.subscribers.add(subscriber);
  broadcastPresence();
  return () => {
    state.subscribers.delete(subscriber);
    broadcastPresence();
  };
}

export function communityOnlineCount() {
  return state.subscribers.size;
}

function broadcastPresence() {
  const payload = { online: communityOnlineCount() };
  for (const subscriber of state.subscribers) subscriber({ type: "presence", payload });
}

export function resetCommunityChatForTests() {
  state.messages.length = 0;
  state.subscribers.clear();
}
