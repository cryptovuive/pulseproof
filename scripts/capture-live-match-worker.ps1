param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PublicOrigin = 'https://pulseproof-production-06fa.up.railway.app',
  [int]$FixtureId,
  [string]$ExpectedHome,
  [string]$ExpectedAway,
  [int]$DurationSeconds = 12600,
  [string]$RunName
)

$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PulseProofCapturePower {
  [DllImport("kernel32.dll", SetLastError = true)]
  public static extern uint SetThreadExecutionState(uint executionState);
}
"@
$ES_CONTINUOUS = [uint32]2147483648
$ES_SYSTEM_REQUIRED = [uint32]0x00000001
$ES_AWAYMODE_REQUIRED = [uint32]0x00000040
$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$node = (Get-Command node.exe -ErrorAction Stop).Source
foreach ($binary in @($ffmpeg, $chrome, $node)) {
  if (-not (Test-Path $binary)) { throw "Missing required binary: $binary" }
}
if (-not $FixtureId -or -not $ExpectedHome -or -not $ExpectedAway -or -not $RunName) { throw 'FixtureId, ExpectedHome, ExpectedAway and RunName are required' }
if ($DurationSeconds -lt 10) { throw 'DurationSeconds must be at least 10 seconds' }

$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
$stateFile = Join-Path $runDir 'capture-state.json'
$attemptId = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssfff')
$attemptDir = Join-Path $runDir "attempts\$attemptId"
$videoDir = Join-Path $attemptDir 'video'
$eventsErrorFile = Join-Path $attemptDir 'events-error.log'
$workerLog = Join-Path $attemptDir 'capture-worker.log'
$recorderOutput = Join-Path $attemptDir 'recorder-output.log'
$recorderResult = Join-Path $attemptDir 'recorder-result.json'
$recorderHealth = Join-Path $attemptDir 'recorder-health.json'
$recorderConfig = Join-Path $attemptDir 'recorder-config.json'
New-Item -ItemType Directory -Force $runDir, $attemptDir, $videoDir | Out-Null

$currentContext = @{}
function Write-State([string]$status, [hashtable]$extra = @{}) {
  $state = @{
    status = $status; fixtureId = $FixtureId; expectedHome = $ExpectedHome; expectedAway = $ExpectedAway
    publicOrigin = $PublicOrigin; workerPid = $PID; attemptId = $attemptId; attemptDir = $attemptDir
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $currentContext.Keys) { $state[$key] = $currentContext[$key] }
  foreach ($key in $extra.Keys) { $state[$key] = $extra[$key] }
  $tempState = "$stateFile.$PID.tmp"
  $state | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $tempState
  Move-Item -LiteralPath $tempState -Destination $stateFile -Force
}

$loggerProcesses = [System.Collections.ArrayList]::new()
$eventFileIndex = 0
function Start-EventLogger([string]$streamUrl, [DateTime]$stopAt) {
  $script:eventFileIndex += 1
  $suffix = if ($script:eventFileIndex -eq 1) { '' } else { "-restart-{0:D2}" -f ($script:eventFileIndex - 1) }
  $eventsFile = Join-Path $attemptDir "events$suffix.ndjson"
  $loggerScript = Join-Path $ProjectRoot 'scripts\record-live-sse.mjs'
  $process = Start-Process -FilePath $node -ArgumentList @($loggerScript, $streamUrl, $stopAt.ToString('o')) -RedirectStandardOutput $eventsFile -RedirectStandardError $eventsErrorFile -WindowStyle Hidden -PassThru
  $loggerProcesses.Add($process) | Out-Null
  return [pscustomobject]@{ Process = $process; EventsFile = $eventsFile }
}

$recorderProcess = $null
$logger = $null
$startedAt = (Get-Date).ToUniversalTime()
$stopAt = $startedAt.AddSeconds($DurationSeconds)
try {
  $powerState = [PulseProofCapturePower]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_AWAYMODE_REQUIRED)
  if ($powerState -eq 0) { throw 'Windows refused the keep-awake execution state' }
  $health = Invoke-RestMethod -Uri "$PublicOrigin/api/health" -TimeoutSec 20
  if (-not $health.ok -or -not $health.txline.credentialsConfigured) { throw 'Public health check or TxLINE credentials check failed' }
  if (-not $health.txline.dataLicense.active) { throw 'TxLINE data licence is not active' }
  $snapshot = Invoke-RestMethod -Uri "$PublicOrigin/api/matches" -TimeoutSec 30
  $fixture = @($snapshot.fixtures | Where-Object { $_.fixtureId -eq $FixtureId }) | Select-Object -First 1
  if (-not $fixture) { throw "Fixture $FixtureId is not present in the public match snapshot" }
  if ($fixture.homeTeam -ne $ExpectedHome -or $fixture.awayTeam -ne $ExpectedAway) {
    throw "Fixture identity mismatch: expected $ExpectedHome vs $ExpectedAway, received $($fixture.homeTeam) vs $($fixture.awayTeam)"
  }
  @{
    capturedAt = $startedAt.ToString('o'); fixture = $fixture; apiSource = $snapshot.source; health = $health
  } | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $attemptDir 'preflight.json')

  $streamUrl = "$PublicOrigin/api/scores/stream?fixtureIds=$FixtureId"
  $logger = Start-EventLogger $streamUrl $stopAt

  $segmentPattern = Join-Path $videoDir 'live-part-%03d.mp4'
  $profilePath = Join-Path $env:TEMP "pulseproof-headless-$RunName-$attemptId"
  @{
    pageUrl = "$PublicOrigin/?fixture=$FixtureId&liveCapture=1"
    videoPattern = $segmentPattern; durationSeconds = $DurationSeconds; frameRate = 5
    chromePath = $chrome; ffmpegPath = $ffmpeg; profilePath = $profilePath; resultFile = $recorderResult
    healthFile = $recorderHealth; expectedHome = $ExpectedHome; expectedAway = $ExpectedAway; timezoneId = 'Asia/Bangkok'
  } | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $recorderConfig
  $recorderScript = Join-Path $ProjectRoot 'scripts\headless-live-page-recorder.mjs'
  $recorderProcess = Start-Process -FilePath $node -ArgumentList @($recorderScript, $recorderConfig) -RedirectStandardOutput $recorderOutput -RedirectStandardError $workerLog -WindowStyle Hidden -PassThru
  $currentContext = @{
    startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); loggerPid = $logger.Process.Id
    recorderPid = $recorderProcess.Id; videoPattern = $segmentPattern; eventsFile = $logger.EventsFile
    recorderHealthFile = $recorderHealth; lastLivenessAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  Write-State 'recording'

  $lastVideoBytes = [int64]0
  $lastVideoGrowthAt = (Get-Date).ToUniversalTime()
  while (-not $recorderProcess.WaitForExit(15000)) {
    $now = (Get-Date).ToUniversalTime()
    if ($logger.Process.HasExited -and $now -lt $stopAt.AddSeconds(-10)) {
      $logger = Start-EventLogger $streamUrl $stopAt
      $currentContext.loggerPid = $logger.Process.Id
      $currentContext.eventsFile = $logger.EventsFile
      $currentContext.loggerRestarts = $eventFileIndex - 1
    }
    $healthAgeSeconds = $null
    if (Test-Path $recorderHealth) {
      $healthAgeSeconds = [Math]::Round(($now - (Get-Item $recorderHealth).LastWriteTimeUtc).TotalSeconds, 1)
    }
    if (($now - $startedAt).TotalSeconds -gt 75 -and ($null -eq $healthAgeSeconds -or $healthAgeSeconds -gt 45)) {
      throw "Recorder liveness file is stale: $healthAgeSeconds seconds"
    }
    $videoBytes = [int64]((Get-ChildItem -LiteralPath $videoDir -Filter '*.mp4' -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum)
    if ($videoBytes -gt $lastVideoBytes) {
      $lastVideoBytes = $videoBytes
      $lastVideoGrowthAt = $now
    }
    if (($now - $startedAt).TotalSeconds -gt 120 -and ($now - $lastVideoGrowthAt).TotalSeconds -gt 90) {
      throw 'Recorder video output stopped growing for more than 90 seconds'
    }
    $currentContext.lastLivenessAt = $now.ToString('o')
    $currentContext.recorderHealthAgeSeconds = $healthAgeSeconds
    $currentContext.videoBytes = $videoBytes
    $currentContext.segmentCount = @(Get-ChildItem -LiteralPath $videoDir -Filter '*.mp4' -ErrorAction SilentlyContinue).Count
    Write-State 'recording'
  }
  if (-not (Test-Path $recorderResult)) { throw 'Headless recorder stopped without a result file' }
  $result = Get-Content -Raw $recorderResult | ConvertFrom-Json
  if ($result.status -ne 'completed') { throw "Headless recorder failed: $($result.error)" }
  $currentContext.videoBytes = [int64]((Get-ChildItem -LiteralPath $videoDir -Filter '*.mp4' | Measure-Object -Property Length -Sum).Sum)
  $currentContext.segmentCount = @(Get-ChildItem -LiteralPath $videoDir -Filter '*.mp4').Count
  Write-State 'completed' @{ recorderResult = $result; completedAt = (Get-Date).ToUniversalTime().ToString('o') }
} catch {
  Write-State 'failed' @{ startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); error = $_.Exception.Message }
  throw
} finally {
  foreach ($loggerProcess in $loggerProcesses) {
    if ($loggerProcess -and -not $loggerProcess.HasExited) { Stop-Process -Id $loggerProcess.Id -Force -ErrorAction SilentlyContinue }
  }
  if ($recorderProcess -and -not $recorderProcess.HasExited) { Stop-Process -Id $recorderProcess.Id -Force -ErrorAction SilentlyContinue }
  [PulseProofCapturePower]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
}
