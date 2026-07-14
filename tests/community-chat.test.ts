import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/community/chat/route";
import { getCommunityMessages, resetCommunityChatForTests, validateChatText } from "@/lib/community-chat";
import { resetAttestationLimitsForTests } from "@/lib/rate-limit";

describe("live community chat", () => {
  beforeEach(() => {
    resetCommunityChatForTests();
    resetAttestationLimitsForTests();
  });

  it("starts empty and stores only real submitted messages", async () => {
    expect(getCommunityMessages()).toEqual([]);
    const response = await POST(new NextRequest("http://localhost/api/community/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "chat-test" },
      body: JSON.stringify({ nickname: "VietFan", team: "VIE", body: "What a finish!" }),
    }));
    expect(response.status).toBe(201);
    expect(getCommunityMessages()).toHaveLength(1);
    expect(getCommunityMessages()[0]).toMatchObject({ nickname: "VietFan", team: "VIE", body: "What a finish!" });
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
      addCommunityMessage({ nickname: "LoadTest", body: `Message ${index}` });
    }
    expect(getCommunityMessages()).toHaveLength(50);
    expect(getCommunityMessages()[0].body).toBe("Message 5");
  });
});
