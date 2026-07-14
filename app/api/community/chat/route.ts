import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addCommunityMessage,
  communityOnlineCount,
  getCommunityMessages,
  subscribeToCommunityChat,
  validateChatText,
} from "@/lib/community-chat";
import { consumeAttestationLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({
  nickname: z.string().trim().min(2).max(24).regex(/^[\p{L}\p{N}_ .-]+$/u),
  body: z.string().min(1).max(500),
  walletHint: z.string().trim().max(16).optional(),
  team: z.string().regex(/^[A-Z]{2,4}$/).optional(),
});

const encode = (event: string, payload: unknown) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (event: string, payload: unknown) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(encode(event, payload))); } catch { closed = true; }
      };
      send("ready", { serverTime: new Date().toISOString() });
      send("history", { messages: getCommunityMessages() });
      unsubscribe = subscribeToCommunityChat(({ type, payload }) => send(type, payload));
      send("presence", { online: communityOnlineCount() });
      heartbeat = setInterval(() => send("heartbeat", { at: new Date().toISOString() }), 15_000);
      request.signal.addEventListener("abort", () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      }, { once: true });
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_048) return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    const body = messageSchema.parse(await request.json());
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:community-chat`);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Chat rate limit reached" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const message = addCommunityMessage({
      nickname: body.nickname,
      body: validateChatText(body.body),
      walletHint: body.walletHint || undefined,
      team: body.team,
    });
    return NextResponse.json({ message }, {
      status: 201,
      headers: { "Cache-Control": "no-store", "X-RateLimit-Remaining": String(limit.remaining) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Message could not be sent" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
