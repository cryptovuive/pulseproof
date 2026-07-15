import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import WebSocket from "ws";

const [configPath] = process.argv.slice(2);
if (!configPath) throw new Error("Usage: node headless-live-page-recorder.mjs <config.json>");
const configText = (await readFile(configPath, "utf8")).replace(/^\uFEFF/, "").replace(/^ï»¿/, "");
const config = JSON.parse(configText);
const required = ["pageUrl", "videoPattern", "durationSeconds", "chromePath", "ffmpegPath", "profilePath", "resultFile"];
for (const field of required) if (!config[field]) throw new Error(`Recorder config is missing ${field}`);
if (config.durationSeconds < 10) throw new Error("durationSeconds must be at least 10");

await mkdir(dirname(config.videoPattern), { recursive: true });
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(config.chromePath, [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${config.profilePath}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-session-crashed-bubble",
  "--disable-features=Translate,PasswordLeakDetection",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--window-size=1920,1080",
  config.pageUrl,
], { stdio: ["ignore", "ignore", "pipe"], windowsHide: true });
chrome.stderr.on("data", (chunk) => process.stderr.write(chunk));

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function findPage() {
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = pages.find((entry) => entry.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch (error) { lastError = error; }
    await sleep(250);
  }
  throw lastError ?? new Error("Chrome DevTools page did not become ready");
}

let socket;
let ffmpeg;
let completed = false;
const startedAt = new Date();
try {
  const page = await findPage();
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  let commandId = 0;
  const pending = new Map();
  let latestFrame = null;
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      return;
    }
    if (message.method === "Page.screencastFrame") {
      latestFrame = Buffer.from(message.params.data, "base64");
      socket.send(JSON.stringify({ id: ++commandId, method: "Page.screencastFrameAck", params: { sessionId: message.params.sessionId } }));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++commandId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: config.pageUrl });
  await sleep(8_000);
  await send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  if (!latestFrame) {
    const screenshot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82, fromSurface: true });
    latestFrame = Buffer.from(screenshot.data, "base64");
  }

  const frameRate = Number(config.frameRate ?? 5);
  ffmpeg = spawn(config.ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(frameRate), "-vcodec", "mjpeg", "-i", "pipe:0",
    "-an", "-r", "24", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    "-force_key_frames", "expr:gte(t,n_forced*60)",
    "-f", "segment", "-segment_time", "900", "-reset_timestamps", "1", "-segment_format", "mp4",
    config.videoPattern,
  ], { stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
  ffmpeg.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const targets = ["match-center", "catch-up", "event-timeline"];
  const frameInterval = Math.round(1000 / frameRate);
  const stopAt = Date.now() + Number(config.durationSeconds) * 1000;
  let frame = 0;
  let targetIndex = 0;
  while (Date.now() < stopAt) {
    const tick = Date.now();
    if (latestFrame && !ffmpeg.stdin.destroyed) {
      if (!ffmpeg.stdin.write(latestFrame)) await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
      frame += 1;
    }
    if (frame > 0 && frame % (frameRate * 20) === 0) {
      const target = targets[targetIndex % targets.length];
      targetIndex += 1;
      await send("Runtime.evaluate", { expression: `document.getElementById(${JSON.stringify(target)})?.scrollIntoView({behavior:'smooth',block:'start'})` });
    }
    const remaining = frameInterval - (Date.now() - tick);
    if (remaining > 0) await sleep(remaining);
  }
  ffmpeg.stdin.end();
  const exitCode = await new Promise((resolve) => ffmpeg.once("exit", resolve));
  if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);
  await send("Page.stopScreencast").catch(() => undefined);
  completed = true;
  const result = { status: "completed", startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(), frames: frame, frameRate };
  await writeFile(`${config.resultFile}.tmp`, JSON.stringify(result, null, 2), "utf8");
  await rename(`${config.resultFile}.tmp`, config.resultFile);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const result = { status: "failed", startedAt: startedAt.toISOString(), failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
  await writeFile(`${config.resultFile}.tmp`, JSON.stringify(result, null, 2), "utf8").catch(() => undefined);
  await rename(`${config.resultFile}.tmp`, config.resultFile).catch(() => undefined);
  throw error;
} finally {
  if (ffmpeg && !ffmpeg.killed && !completed) ffmpeg.kill();
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (!chrome.killed) chrome.kill();
  await rm(config.profilePath, { recursive: true, force: true }).catch(() => undefined);
}
