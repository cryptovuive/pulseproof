const [streamUrl, stopAtIso] = process.argv.slice(2);
if (!streamUrl || !stopAtIso) throw new Error("Usage: node record-live-sse.mjs <stream-url> <stop-at-iso>");
const stopAt = Date.parse(stopAtIso);
if (!Number.isFinite(stopAt)) throw new Error("stop-at-iso must be a valid ISO timestamp");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const write = (record) => process.stdout.write(`${JSON.stringify({ receivedAt: new Date().toISOString(), ...record })}\n`);

let connection = 0;
while (Date.now() < stopAt) {
  const controller = new AbortController();
  const remaining = Math.max(1, stopAt - Date.now());
  const timer = setTimeout(() => controller.abort(), remaining);
  try {
    connection += 1;
    const response = await fetch(streamUrl, { signal: controller.signal, cache: "no-store" });
    if (!response.ok || !response.body) throw new Error(`SSE returned HTTP ${response.status}`);
    write({ kind: "connection", connection, status: response.status, contentType: response.headers.get("content-type") });
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    while (Date.now() < stopAt) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value.replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let event = "message";
        const data = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
        }
        const rawData = data.join("\n");
        let parsed = rawData;
        try { parsed = JSON.parse(rawData); } catch { /* preserve non-JSON provider data verbatim */ }
        write({ kind: "event", connection, event, data: parsed });
        boundary = buffer.indexOf("\n\n");
      }
    }
    write({ kind: "disconnect", connection, reason: "stream-ended" });
  } catch (error) {
    if (Date.now() < stopAt) write({ kind: "disconnect", connection, reason: error instanceof Error ? error.message : String(error) });
  } finally {
    clearTimeout(timer);
  }
  if (Date.now() < stopAt) await sleep(2_000);
}
write({ kind: "complete", connections: connection });
