import { describe, expect, it } from "vitest";
import { extractScoreRecords, parseSseBlock, parseSseJson, readSseMessages } from "@/lib/sse";

describe("SSE bridge parser", () => {
  it("parses comments, ids and multi-line data according to the SSE format", () => {
    const parsed = parseSseBlock(": heartbeat\nid: 42\nevent: score\ndata: {\"FixtureId\":1,\ndata: \"Seq\":2}\nretry: 1500");
    expect(parsed).toEqual({ event: "score", data: "{\"FixtureId\":1,\n\"Seq\":2}", id: "42", retry: 1500 });
  });

  it("handles event boundaries split across network chunks", async () => {
    const chunks = ["event: score\ndata: {\"Fixture", "Id\":99,\"Seq\":4,\"Action\":\"goal\"}\n\n", ": ping\n\nevent: ready\ndata: {}\n\n"];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    });
    const messages = [];
    for await (const message of readSseMessages(new Response(body))) messages.push(message);
    expect(messages.map((message) => message.event)).toEqual(["score", "ready"]);
    expect(parseSseJson(messages[0])).toMatchObject({ FixtureId: 99, Seq: 4 });
  });

  it("extracts score records from common TxLINE envelopes without accepting unrelated objects", () => {
    const records = extractScoreRecords({ data: { events: [
      { FixtureId: 7, Seq: 8, Action: "corner" },
      { kind: "heartbeat", at: 123 },
    ] } });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ FixtureId: 7, Seq: 8 });
  });
});
