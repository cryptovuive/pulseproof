import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, open, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

const [runName = "england-argentina-2026-07-16-github", overrideText = "0"] = process.argv.slice(2);
const origin = "https://pulseproof-production-06fa.up.railway.app";
const fixtureId = 18241006;
const expectedHome = "England";
const expectedAway = "Argentina";
const hardDeadline = Date.parse("2026-07-15T23:30:00.000Z");
const overrideSeconds = Number(overrideText);
const chromePath = process.env.CHROME_PATH;
const ffmpegPath = process.env.FFMPEG_PATH;
const ffprobePath = process.env.FFPROBE_PATH;
if (!chromePath || !ffmpegPath || !ffprobePath) throw new Error("CHROME_PATH, FFMPEG_PATH and FFPROBE_PATH are required");
if (!runName.match(/^[a-z0-9-]+$/)) throw new Error("Run name must contain only lowercase letters, numbers and hyphens");

const projectRoot = resolve(import.meta.dirname, "..");
const runDir = join(projectRoot, "submission-assets", "live-match", runName);
await mkdir(runDir, { recursive: true });
const atomicJson = async (path, value) => {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2), "utf8");
  await rename(`${path}.tmp`, path);
};
const run = (command, args, options = {}) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { windowsHide: true, ...options });
  child.once("error", reject);
  child.once("exit", (code) => code === 0 ? resolveRun() : reject(new Error(`${basename(command)} exited with code ${code}`)));
});
const sha256 = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");
const walk = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path)); else files.push(path);
  }
  return files;
};

const health = await fetch(`${origin}/api/health`, { cache: "no-store" }).then((response) => response.json());
if (!health.ok || !health.txline?.credentialsConfigured || !health.txline?.dataLicense?.active) {
  throw new Error("Production health, TxLINE credentials or data licence preflight failed");
}
const snapshot = await fetch(`${origin}/api/matches`, { cache: "no-store" }).then((response) => response.json());
const fixture = snapshot.fixtures?.find((candidate) => candidate.fixtureId === fixtureId);
if (!fixture || fixture.homeTeam !== expectedHome || fixture.awayTeam !== expectedAway) {
  throw new Error(`Fixture identity mismatch for ${fixtureId}`);
}
await atomicJson(join(runDir, "preflight.json"), { capturedAt: new Date().toISOString(), origin, health, fixture, source: snapshot.source });

const requestedStopAt = overrideSeconds > 0 ? Date.now() + overrideSeconds * 1000 : hardDeadline;
if (requestedStopAt - Date.now() < 10_000) throw new Error("The remote capture window has already closed");
const attempts = [];
let captureCompleted = false;
for (let attemptNumber = 1; attemptNumber <= 5 && Date.now() < requestedStopAt - 10_000; attemptNumber += 1) {
  const attemptId = new Date().toISOString().replace(/[-:.TZ]/g, "");
  const attemptDir = join(runDir, "attempts", `${attemptId}-${String(attemptNumber).padStart(2, "0")}`);
  const videoDir = join(attemptDir, "video");
  await mkdir(videoDir, { recursive: true });
  const remainingSeconds = Math.max(10, Math.floor((requestedStopAt - Date.now()) / 1000));
  const resultFile = join(attemptDir, "recorder-result.json");
  const configFile = join(attemptDir, "recorder-config.json");
  const eventsFile = join(attemptDir, "events.ndjson");
  const eventsErrorFile = join(attemptDir, "events-error.log");
  const recorderOutput = join(attemptDir, "recorder-output.log");
  const recorderError = join(attemptDir, "recorder-error.log");
  const config = {
    pageUrl: `${origin}/?fixture=${fixtureId}&liveCapture=1`,
    videoPattern: join(videoDir, "live-part-%03d.mp4"), durationSeconds: remainingSeconds, frameRate: 5,
    chromePath, ffmpegPath, profilePath: join(tmpdir(), `pulseproof-github-${attemptId}`), resultFile,
    healthFile: join(attemptDir, "recorder-health.json"), expectedHome, expectedAway,
    noSandbox: process.platform === "linux",
    timezoneId: "Asia/Bangkok",
  };
  await atomicJson(configFile, config);
  const stopAtIso = new Date(Date.now() + remainingSeconds * 1000).toISOString();
  const eventsOut = await open(eventsFile, "w");
  const eventsError = await open(eventsErrorFile, "w");
  const logger = spawn(process.execPath, [join(projectRoot, "scripts", "record-live-sse.mjs"), `${origin}/api/scores/stream?fixtureIds=${fixtureId}`, stopAtIso], {
    stdio: ["ignore", eventsOut.fd, eventsError.fd], windowsHide: true,
  });
  const attempt = { attemptNumber, attemptId, startedAt: new Date().toISOString(), remainingSeconds, attemptDir: relative(runDir, attemptDir) };
  attempts.push(attempt);
  try {
    const output = await open(recorderOutput, "w");
    const error = await open(recorderError, "w");
    try {
      await run(process.execPath, [join(projectRoot, "scripts", "headless-live-page-recorder.mjs"), configFile], { stdio: ["ignore", output.fd, error.fd] });
    } finally {
      await Promise.all([output.close(), error.close()]);
    }
    const result = JSON.parse(await readFile(resultFile, "utf8"));
    if (result.status !== "completed") throw new Error(result.error ?? "Remote recorder did not complete");
    attempt.status = "completed";
    attempt.completedAt = new Date().toISOString();
    captureCompleted = true;
  } catch (error) {
    attempt.status = "failed";
    attempt.failedAt = new Date().toISOString();
    attempt.error = error instanceof Error ? error.message : String(error);
  } finally {
    if (logger.exitCode === null) {
      logger.kill("SIGTERM");
      await Promise.race([
        new Promise((resolveExit) => logger.once("exit", resolveExit)),
        new Promise((resolveTimeout) => setTimeout(resolveTimeout, 2_000)),
      ]);
    }
    await Promise.all([eventsOut.close(), eventsError.close()]);
    await atomicJson(join(runDir, "capture-state.json"), {
      status: captureCompleted ? "completed" : "retrying", fixtureId, expectedHome, expectedAway,
      requestedStopAt: new Date(requestedStopAt).toISOString(), updatedAt: new Date().toISOString(), attempts,
    });
  }
  if (captureCompleted) break;
  await new Promise((resolveWait) => setTimeout(resolveWait, 5_000));
}

const allFiles = await walk(runDir);
const segmentCandidates = allFiles.filter((path) => path.endsWith(".mp4") && !path.endsWith("-full.mp4")).sort();
const validSegments = [];
const invalidSegments = [];
for (const path of segmentCandidates) {
  try {
    const probeOutput = [];
    await new Promise((resolveProbe, reject) => {
      const child = spawn(ffprobePath, ["-v", "error", "-show_entries", "stream=codec_name,width,height", "-show_entries", "format=duration", "-of", "json", path]);
      child.stdout.on("data", (chunk) => probeOutput.push(chunk));
      child.once("error", reject);
      child.once("exit", (code) => code === 0 ? resolveProbe() : reject(new Error(`ffprobe exited ${code}`)));
    });
    const probe = JSON.parse(Buffer.concat(probeOutput).toString("utf8"));
    const durationSeconds = Number(probe.format?.duration);
    if (!(durationSeconds > 0)) throw new Error("zero-duration segment");
    validSegments.push({
      path, file: relative(runDir, path), durationSeconds, bytes: (await stat(path)).size,
      codec: probe.streams?.[0]?.codec_name, width: probe.streams?.[0]?.width, height: probe.streams?.[0]?.height,
      sha256: await sha256(path),
    });
  } catch (error) {
    invalidSegments.push({ file: relative(runDir, path), error: error instanceof Error ? error.message : String(error) });
  }
}
if (!validSegments.length) throw new Error("Remote capture produced no valid MP4 segment");
const concatFile = join(runDir, "concat-segments.txt");
await writeFile(concatFile, `${validSegments.map(({ path }) => `file '${path.replaceAll("'", "'\\''")}'`).join("\n")}\n`, "ascii");
const fullVideo = join(runDir, `${runName}-full.mp4`);
await run(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-fflags", "+genpts", "-avoid_negative_ts", "make_zero", "-c", "copy", "-movflags", "+faststart", fullVideo], { stdio: "inherit" });
const eventLines = [];
for (const path of allFiles.filter((candidate) => basename(candidate).startsWith("events") && candidate.endsWith(".ndjson"))) {
  eventLines.push(...(await readFile(path, "utf8")).split(/\r?\n/).filter(Boolean));
}
const parsedEvents = eventLines.map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
const manifest = {
  finalizedAt: new Date().toISOString(), source: "GitHub-hosted independent recorder", fixture, captureCompleted,
  uninterrupted: captureCompleted && attempts.length === 1 && invalidSegments.length === 0,
  attempts, validSegmentCount: validSegments.length, invalidSegments,
  totalSegmentSeconds: validSegments.reduce((sum, segment) => sum + segment.durationSeconds, 0),
  sseEventCount: parsedEvents.filter((event) => event.kind === "event").length,
  assembledVideo: { file: basename(fullVideo), bytes: (await stat(fullVideo)).size, sha256: await sha256(fullVideo) },
  video: validSegments.map(({ file, durationSeconds, bytes, codec, width, height, sha256: hash }) => ({
    file, durationSeconds, bytes, codec, width, height, sha256: hash,
  })),
};
await atomicJson(join(runDir, "capture-manifest.json"), manifest);
await atomicJson(join(runDir, "capture-state.json"), {
  status: captureCompleted ? "completed" : "partial", fixtureId, expectedHome, expectedAway,
  requestedStopAt: new Date(requestedStopAt).toISOString(), updatedAt: new Date().toISOString(), attempts,
  manifest: "capture-manifest.json", fullVideo: basename(fullVideo),
});
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
if (!captureCompleted) process.exitCode = 2;
