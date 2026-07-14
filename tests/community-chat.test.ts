import { NextRequest } from "next/server";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/community/chat/route";
import { buildChatSigningPayload } from "@/lib/chat-signature";
import { getCommunityMessages, resetCommunityChatForTests, validateChatText } from "@/lib/community-chat";
import { resetAttestationLimitsForTests } from "@/lib/rate-limit";

vi.mock("@/lib/fan-alias", () => ({
  fetchFanAliasFromChain: async (owner: { toBase58(): string }) => ({ displayName: "VietFan", owner: owner.toBase58() }),
}));

describe("live community chat", () => {
  beforeEach(() => {
    resetCommunityChatForTests();
    resetAttestationLimitsForTests();
  });

  it("starts empty and stores only real submitted messages", async () => {
    const signer = Keypair.generate();
    const fixtureId = 18209181;
    const signedAt = Date.now();
    const body = "What a finish!";
    const signatureBase64 = Buffer.from(nacl.sign.detached(buildChatSigningPayload({ wallet: signer.publicKey.toBase58(), fixtureId, signedAt, body }), signer.secretKey)).toString("base64");
    expect(getCommunityMessages(fixtureId)).toEqual([]);
    const request = () => new NextRequest("http://localhost/api/community/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "chat-test" },
      body: JSON.stringify({ fixtureId, wallet: signer.publicKey.toBase58(), signedAt, signatureBase64, team: "VIE", body }),
    });
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(getCommunityMessages(fixtureId)).toHaveLength(1);
    expect(getCommunityMessages(fixtureId)[0]).toMatchObject({ nickname: "VietFan", team: "VIE", body });
    expect((await POST(request())).status).toBe(400);
  });

  it("blocks links, wagering language, secrets and repeated-character spam", () => {
    expect(() => validateChatText("visit https://spam.test")).toThrow("not allowed");
    expect(() => validateChatText("place a bet now")).toThrow("not allowed");
    expect(() => validateChatText("send your seed phrase")).toThrow("not allowed");
    expect(() => validateChatText("goooooooooooooal")).toThrow("spam");
  });

  it("bounds the retained room history to fifty messages", async () => {
    for (let index = 0; index < 55; index += 1) {
      const { addCommunityMessage } = await import("@/lib/community-chat");
      addCommunityMessage({ fixtureId: 42, nickname: "LoadTest", wallet: "11111111111111111111111111111111", walletHint: "1111…1111", body: `Message ${index}` });
    }
    expect(getCommunityMessages(42)).toHaveLength(50);
    expect(getCommunityMessages(42)[0].body).toBe("Message 5");
    expect(getCommunityMessages(43)).toEqual([]);
  });

  it("rejects a signature if the signed body is modified", async () => {
    const signer = Keypair.generate();
    const fixtureId = 18209181;
    const signedAt = Date.now();
    const signatureBase64 = Buffer.from(nacl.sign.detached(buildChatSigningPayload({ wallet: signer.publicKey.toBase58(), fixtureId, signedAt, body: "Original" }), signer.secretKey)).toString("base64");
    const response = await POST(new NextRequest("http://localhost/api/community/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fixtureId, wallet: signer.publicKey.toBase58(), signedAt, signatureBase64, body: "Modified" }),
    }));
    expect(response.status).toBe(401);
    expect(getCommunityMessages(fixtureId)).toEqual([]);
  });
});
