param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PublicOrigin = 'https://pulseproof-production-06fa.up.railway.app',
  [int]$FixtureId = 18237038,
  [int]$DurationSeconds = 12600,
  [string]$RunName = 'france-spain-2026-07-15'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PulseProofLiveCaptureWindow {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$node = (Get-Command node.exe -ErrorAction Stop).Source
foreach ($binary in @($ffmpeg, $chrome, $node)) {
  if (-not (Test-Path $binary)) { throw "Missing required binary: $binary" }
}
if ($DurationSeconds -lt 10) { throw 'DurationSeconds must be at least 10 seconds' }

$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
$videoDir = Join-Path $runDir 'video'
$stateFile = Join-Path $runDir 'capture-state.json'
$eventsFile = Join-Path $runDir 'events.ndjson'
$eventsErrorFile = Join-Path $runDir 'events-error.log'
$workerLog = Join-Path $runDir 'capture-worker.log'
New-Item -ItemType Directory -Force $runDir, $videoDir | Out-Null

function Write-State([string]$status, [hashtable]$extra = @{}) {
  $state = @{
    status = $status
    fixtureId = $FixtureId
    publicOrigin = $PublicOrigin
    workerPid = $PID
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $extra.Keys) { $state[$key] = $extra[$key] }
  $state | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $stateFile
}

$chromeProfile = Join-Path $env:TEMP "pulseproof-live-$RunName"
$loggerProcess = $null
$chromeProcesses = @()
$startedAt = (Get-Date).ToUniversalTime()
$stopAt = $startedAt.AddSeconds($DurationSeconds)

try {
  $health = Invoke-RestMethod -Uri "$PublicOrigin/api/health" -TimeoutSec 20
  if (-not $health.ok -or -not $health.txline.credentialsConfigured) { throw 'Public health check or TxLINE credentials check failed' }
  $snapshot = Invoke-RestMethod -Uri "$PublicOrigin/api/matches" -TimeoutSec 30
  $fixture = @($snapshot.fixtures | Where-Object { $_.fixtureId -eq $FixtureId }) | Select-Object -First 1
  if (-not $fixture) { throw "Fixture $FixtureId is not present in the public match snapshot" }
  if ($fixture.homeTeam -ne 'France' -or $fixture.awayTeam -ne 'Spain') {
    throw "Fixture identity mismatch: expected France vs Spain, received $($fixture.homeTeam) vs $($fixture.awayTeam)"
  }
  @{
    capturedAt = $startedAt.ToString('o')
    fixture = $fixture
    apiSource = $snapshot.source
    health = $health
  } | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $runDir 'preflight.json')

  if (Test-Path $chromeProfile) { Remove-Item -LiteralPath $chromeProfile -Recurse -Force }
  New-Item -ItemType Directory -Force $chromeProfile | Out-Null
  $streamUrl = "$PublicOrigin/api/scores/stream?fixtureIds=$FixtureId"
  $loggerScript = Join-Path $ProjectRoot 'scripts\record-live-sse.mjs'
  $loggerProcess = Start-Process -FilePath $node -ArgumentList @($loggerScript, $streamUrl, $stopAt.ToString('o')) -RedirectStandardOutput $eventsFile -RedirectStandardError $eventsErrorFile -WindowStyle Hidden -PassThru

  $pageUrl = "$PublicOrigin/?fixture=$FixtureId&liveCapture=1"
  $chromeArgs = @(
    "--user-data-dir=$chromeProfile",
    '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble',
    '--disable-features=Translate,PasswordLeakDetection', '--force-device-scale-factor=1',
    '--window-position=0,0', '--window-size=1920,1080', '--new-window', '--kiosk', $pageUrl
  )
  Start-Process -FilePath $chrome -ArgumentList $chromeArgs | Out-Null
  Start-Sleep -Seconds 8
  $chromeProcesses = @(Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -like "*$chromeProfile*" })
  $windowProcess = $chromeProcesses |
    ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $windowProcess) { throw 'Could not resolve the dedicated Chrome capture window' }
  [PulseProofLiveCaptureWindow]::ShowWindow($windowProcess.MainWindowHandle, 3) | Out-Null
  Start-Sleep -Seconds 2
  $windowHandle = '0x{0:X}' -f $windowProcess.MainWindowHandle.ToInt64()
  $segmentPattern = Join-Path $videoDir 'france-spain-live-part-%03d.mp4'
  $ffmpegArgs = @(
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'gdigrab', '-draw_mouse', '0', '-framerate', '24', '-i', "hwnd=$windowHandle",
    '-t', "$DurationSeconds", '-an', '-vf', 'scale=1920:1080',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-force_key_frames', 'expr:gte(t,n_forced*60)',
    '-f', 'segment', '-segment_time', '900', '-reset_timestamps', '1', '-segment_format', 'mp4',
    $segmentPattern
  )
  Write-State 'recording' @{
    startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o')
    loggerPid = $loggerProcess.Id
    chromePids = @($chromeProcesses.ProcessId); videoPattern = $segmentPattern; eventsFile = $eventsFile
  }
  $captureProcess = Start-Process -FilePath $ffmpeg -ArgumentList $ffmpegArgs -RedirectStandardError $workerLog -WindowStyle Hidden -Wait -PassThru
  $ffmpegExitCode = $captureProcess.ExitCode
  if ($ffmpegExitCode -ne 0) { throw "FFmpeg exited with code $ffmpegExitCode" }
  Write-State 'completed' @{ startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); ffmpegExitCode = $ffmpegExitCode }
} catch {
  Write-State 'failed' @{ startedAt = $startedAt.ToString('o'); error = $_.Exception.Message }
  throw
} finally {
  if ($loggerProcess -and -not $loggerProcess.HasExited) { Stop-Process -Id $loggerProcess.Id -Force -ErrorAction SilentlyContinue }
  foreach ($process in $chromeProcesses) { Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }
}
