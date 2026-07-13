type JsonRecord = Record<string, unknown>;

export interface SseMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

export function parseSseBlock(block: string): SseMessage | undefined {
  let event = "message";
  let id: string | undefined;
  let retry: number | undefined;
  const data: string[] = [];

  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) continue;
    const separator = rawLine.indexOf(":");
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator);
    let value = separator === -1 ? "" : rawLine.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value || "message";
    if (field === "data") data.push(value);
    if (field === "id" && !value.includes("\0")) id = value;
    if (field === "retry" && /^\d+$/.test(value)) retry = Number(value);
  }

  if (!data.length) return undefined;
  return { event, data: data.join("\n"), id, retry };
}

export async function* readSseMessages(response: Response): AsyncGenerator<SseMessage> {
  if (!response.body) throw new Error("SSE response has no readable body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const message = parseSseBlock(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (message) yield message;
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    const finalMessage = parseSseBlock(buffer);
    if (finalMessage) yield finalMessage;
  } finally {
    reader.releaseLock();
  }
}

export function parseSseJson(message: SseMessage): unknown {
  try {
    return JSON.parse(message.data) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeScoreRecord(record: JsonRecord): boolean {
  const keys = Object.keys(record).map((key) => key.toLowerCase());
  return keys.includes("fixtureid") && (keys.includes("action") || keys.includes("seq") || keys.includes("stats"));
}

export function extractScoreRecords(payload: unknown): JsonRecord[] {
  const found: JsonRecord[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown, depth: number) => {
    if (depth > 5 || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (!isRecord(value)) return;
    if (looksLikeScoreRecord(value)) {
      found.push(value);
      return;
    }
    for (const nested of Object.values(value)) visit(nested, depth + 1);
  };
  visit(payload, 0);
  return found;
}
