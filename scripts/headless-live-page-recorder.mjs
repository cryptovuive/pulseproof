import { spawn } from "node:child_process";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import WebSocket from "ws";

const [configPath] = process.argv.slice(2);
if (!configPath) throw new Error("Usage: node headless-live-page-recorder.mjs <config.json>");
const configText = (await readFile(configPath, "utf8")).replace(/^\uFEFF/, "").replace(/^Ã¯Â»Â¿/, "");
const config = JSON.parse(configText);
const required = ["pageUrl", "videoPattern", "durationSeconds", "chromePath", "ffmpegPath", "profilePath", "resultFile"];
for (const field of required) if (!config[field]) throw new Error(`Recorder config is missing ${field}`);
if (config.durationSeconds < 10) throw new Error("durationSeconds must be at least 10");

await mkdir(dirname(config.videoPattern), { recursive: true });
const atomicWrite = async (file, value) => {
  if (!file) return;
  await writeFile(`${file}.tmp`, JSON.stringify(value, null, 2), "utf8");
  await rename(`${file}.tmp`, file);
};
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
  let socketFailure = null;
  const rejectPending = (error) => {
    socketFailure = error;
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(error);
    }
    pending.clear();
  };
  socket.on("close", () => rejectPending(new Error("Chrome DevTools connection closed")));
  socket.on("error", (error) => rejectPending(error));
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.id && pending.has(message.id)) {
      const { resolve, reject, timer } = pending.get(message.id);
      clearTimeout(timer);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
      return;
    }
    if (message.method === "Page.screencastFrame") {
      latestFrame = Buffer.from(message.params.data, "base64");
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ id: ++commandId, method: "Page.screencastFrameAck", params: { sessionId: message.params.sessionId } }));
      }
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    if (socketFailure) return reject(socketFailure);
    if (socket.readyState !== WebSocket.OPEN) return reject(new Error("Chrome DevTools connection is not open"));
    const id = ++commandId;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Chrome DevTools command timed out: ${method}`));
    }, 12_000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const inspectPage = async () => {
    const result = await send("Runtime.evaluate", {
      expression: "({readyState:document.readyState,url:location.href,title:document.title,text:(document.body?.innerText||'').slice(0,120000)})",
      returnByValue: true,
    });
    return result.result?.value ?? {};
  };
  const expectedTeamsVisible = (state) => {
    const text = String(state.text ?? "").toLowerCase();
    return [config.expectedHome, config.expectedAway].filter(Boolean).every((team) => text.includes(String(team).toLowerCase()));
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: config.pageUrl });
  let pageState = {};
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(500);
    pageState = await inspectPage();
    if (pageState.readyState === "complete" && expectedTeamsVisible(pageState)) break;
  }
  if (pageState.readyState !== "complete") throw new Error(`Product page did not finish loading: ${pageState.readyState ?? "unknown"}`);
  if (!expectedTeamsVisible(pageState)) throw new Error(`Product page does not show ${config.expectedHome} and ${config.expectedAway}`);
  await send("Runtime.evaluate", { expression: "document.getElementById('match-center')?.scrollIntoView({block:'start'});true" });
  await send("Page.startScreencast", { format: "jpeg", quality: 84, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const firstScreenshot = await send("Page.captureScreenshot", { format: "jpeg", quality: 84, fromSurface: true });
  latestFrame = Buffer.from(firstScreenshot.data, "base64");

  const frameRate = Number(config.frameRate ?? 5);
  ffmpeg = spawn(config.ffmpegPath, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(frameRate), "-vcodec", "mjpeg", "-i", "pipe:0",
    "-an", "-r", "24", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
    "-force_key_frames", "expr:gte(t,n_forced*30)",
    "-f", "segment", "-segment_time", "300", "-reset_timestamps", "1", "-segment_format", "mp4",
    "-segment_format_options", "movflags=+frag_keyframe+empty_moov+default_base_moof",
    config.videoPattern,
  ], { stdio: ["pipe", "ignore", "pipe"], windowsHide: true });
  ffmpeg.stderr.on("data", (chunk) => process.stderr.write(chunk));

  const targets = ["match-center", "event-timeline", "catch-up", "match-center"];
  const frameInterval = Math.round(1000 / frameRate);
  const stopAt = Date.now() + Number(config.durationSeconds) * 1000;
  let frame = 0;
  let targetIndex = 0;
  let lastPageProbe = 0;
  let lastScroll = 0;
  while (Date.now() < stopAt) {
    const tick = Date.now();
    if (socketFailure) throw socketFailure;
    if (ffmpeg.exitCode !== null) throw new Error(`FFmpeg stopped unexpectedly with code ${ffmpeg.exitCode}`);
    if (tick - lastPageProbe >= 5_000) {
      pageState = await inspectPage();
      if (!expectedTeamsVisible(pageState)) throw new Error(`Product page lost fixture identity ${config.expectedHome} vs ${config.expectedAway}`);
      const screenshot = await send("Page.captureScreenshot", { format: "jpeg", quality: 84, fromSurface: true });
      latestFrame = Buffer.from(screenshot.data, "base64");
      await atomicWrite(config.healthFile, {
        status: "recording", checkedAt: new Date().toISOString(), frame, pageUrl: pageState.url,
        readyState: pageState.readyState, expectedTeamsVisible: true,
      });
      lastPageProbe = tick;
    }
    if (latestFrame && !ffmpeg.stdin.destroyed) {
      if (!ffmpeg.stdin.write(latestFrame)) await new Promise((resolve) => ffmpeg.stdin.once("drain", resolve));
      frame += 1;
    }
    if (tick - lastScroll >= 20_000) {
      const target = targets[targetIndex % targets.length];
      targetIndex += 1;
      await send("Runtime.evaluate", { expression: `document.getElementById(${JSON.stringify(target)})?.scrollIntoView({behavior:'smooth',block:'start'});true` });
      lastScroll = tick;
    }
    const remaining = frameInterval - (Date.now() - tick);
    if (remaining > 0) await sleep(remaining);
  }
  await send("Page.stopScreencast").catch(() => undefined);
  ffmpeg.stdin.end();
  const exitCode = await new Promise((resolve) => ffmpeg.once("exit", resolve));
  if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);
  completed = true;
  const result = {
    status: "completed", startedAt: startedAt.toISOString(), completedAt: new Date().toISOString(), frames: frame,
    frameRate, pageUrl: config.pageUrl, expectedHome: config.expectedHome, expectedAway: config.expectedAway,
  };
  await atomicWrite(config.healthFile, { ...result, checkedAt: new Date().toISOString() });
  await atomicWrite(config.resultFile, result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  const result = { status: "failed", startedAt: startedAt.toISOString(), failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) };
  await atomicWrite(config.healthFile, { ...result, checkedAt: new Date().toISOString() }).catch(() => undefined);
  await atomicWrite(config.resultFile, result).catch(() => undefined);
  throw error;
} finally {
  if (ffmpeg && !ffmpeg.killed && !completed) ffmpeg.kill();
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (!chrome.killed) chrome.kill();
  await rm(config.profilePath, { recursive: true, force: true }).catch(() => undefined);
}
