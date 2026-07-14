import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { z } from "zod";
import {
  addCommunityMessage,
  communityOnlineCount,
  consumeChatSignature,
  getCommunityMessages,
  subscribeToCommunityChat,
  validateChatText,
} from "@/lib/community-chat";
import { consumeAttestationLimit } from "@/lib/rate-limit";
import { buildChatSigningPayload } from "@/lib/chat-signature";
import { fetchFanAliasFromChain } from "@/lib/fan-alias";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const messageSchema = z.object({
  fixtureId: z.number().int().positive(),
  wallet: z.string().min(32).max(64),
  body: z.string().min(1).max(500),
  signedAt: z.number().int().positive(),
  signatureBase64: z.string().min(80).max(120),
  team: z.string().regex(/^[A-Z]{2,4}$/).optional(),
});

const encode = (event: string, payload: unknown) => `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

export async function GET(request: NextRequest) {
  const fixtureId = Number(request.nextUrl.searchParams.get("fixtureId"));
  if (!Number.isSafeInteger(fixtureId) || fixtureId <= 0) {
    return NextResponse.json({ error: "A positive fixtureId is required" }, { status: 400 });
  }
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
      send("ready", { serverTime: new Date().toISOString(), fixtureId });
      send("history", { messages: getCommunityMessages(fixtureId) });
      unsubscribe = subscribeToCommunityChat(fixtureId, ({ type, payload }) => send(type, payload));
      send("presence", { online: communityOnlineCount(fixtureId) });
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
    const normalizedBody = validateChatText(body.body);
    if (Math.abs(Date.now() - body.signedAt) > 2 * 60_000) {
      return NextResponse.json({ error: "Signed chat message expired" }, { status: 400 });
    }
    const publicKey = new PublicKey(body.wallet);
    const signature = Buffer.from(body.signatureBase64, "base64");
    if (signature.length !== nacl.sign.signatureLength || !nacl.sign.detached.verify(
      buildChatSigningPayload({ wallet: body.wallet, fixtureId: body.fixtureId, signedAt: body.signedAt, body: normalizedBody }),
      signature,
      publicKey.toBytes(),
    )) {
      return NextResponse.json({ error: "Wallet signature did not verify" }, { status: 401 });
    }
    const alias = await fetchFanAliasFromChain(publicKey);
    if (!alias) {
      return NextResponse.json({ error: "Create an on-chain display name in Fan Zone before posting" }, { status: 403 });
    }
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limit = consumeAttestationLimit(`${forwardedFor}:community-chat`);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Chat rate limit reached" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    consumeChatSignature(body.signatureBase64);
    const message = addCommunityMessage({
      fixtureId: body.fixtureId,
      nickname: alias.displayName,
      wallet: body.wallet,
      walletHint: `${body.wallet.slice(0, 4)}…${body.wallet.slice(-4)}`,
      body: normalizedBody,
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
