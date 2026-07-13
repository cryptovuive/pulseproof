import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { extractScoreRecords, parseSseJson, readSseMessages } from "../lib/sse";
import { getFixtures, openScoresStream, scoreRecordFixtureId } from "../lib/txline";

async function main() {
  process.env.TXLINE_NETWORK ??= "devnet";
  if (!process.env.TXLINE_API_TOKEN) {
    const tokenFile = resolve(process.env.TXLINE_TOKEN_FILE ?? ".local-wallets/txline-api-token");
    process.env.TXLINE_API_TOKEN = (await readFile(tokenFile, "utf8")).trim();
  }
  if (!process.env.TXLINE_API_TOKEN) throw new Error("TxLINE API token is empty");

  const fixtures = await getFixtures();
  console.log(JSON.stringify({
    check: "fixtures/snapshot",
    network: process.env.TXLINE_NETWORK,
    authenticated: true,
    fixtureCount: fixtures.length,
    sampleFixtureIds: fixtures.slice(0, 5).map((fixture) => fixture.fixtureId),
  }, null, 2));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TXLINE_STREAM_TIMEOUT_MS ?? 30_000));
  let messages = 0;
  let scoreRecords = 0;
  try {
    const response = await openScoresStream(controller.signal);
    console.log(JSON.stringify({
      check: "scores/stream",
      connected: true,
      status: response.status,
      contentType: response.headers.get("content-type"),
      token: "redacted",
    }, null, 2));
    for await (const message of readSseMessages(response)) {
      messages += 1;
      const records = extractScoreRecords(parseSseJson(message));
      scoreRecords += records.length;
      console.log(JSON.stringify({
        event: message.event,
        message: messages,
        bytes: message.data.length,
        scoreRecords: records.map((record) => ({
          fixtureId: scoreRecordFixtureId(record),
          seq: record.Seq ?? record.seq,
          action: record.Action ?? record.action,
        })),
      }));
      if (messages >= 5) controller.abort();
    }
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "AbortError") throw error;
  } finally {
    clearTimeout(timeout);
  }
  console.log(JSON.stringify({ check: "scores/stream", messages, scoreRecords, completed: true }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
