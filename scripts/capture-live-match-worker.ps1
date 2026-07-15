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
$eventsFile = Join-Path $attemptDir 'events.ndjson'
$eventsErrorFile = Join-Path $attemptDir 'events-error.log'
$workerLog = Join-Path $attemptDir 'capture-worker.log'
$recorderOutput = Join-Path $attemptDir 'recorder-output.log'
$recorderResult = Join-Path $attemptDir 'recorder-result.json'
$recorderConfig = Join-Path $attemptDir 'recorder-config.json'
New-Item -ItemType Directory -Force $runDir, $attemptDir, $videoDir | Out-Null

function Write-State([string]$status, [hashtable]$extra = @{}) {
  $state = @{
    status = $status; fixtureId = $FixtureId; expectedHome = $ExpectedHome; expectedAway = $ExpectedAway
    publicOrigin = $PublicOrigin; workerPid = $PID; attemptId = $attemptId; attemptDir = $attemptDir
    updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  foreach ($key in $extra.Keys) { $state[$key] = $extra[$key] }
  $state | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 $stateFile
}

$loggerProcess = $null
$recorderProcess = $null
$startedAt = (Get-Date).ToUniversalTime()
$stopAt = $startedAt.AddSeconds($DurationSeconds)
try {
  $powerState = [PulseProofCapturePower]::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED)
  if ($powerState -eq 0) { throw 'Windows refused the keep-awake execution state' }
  $health = Invoke-RestMethod -Uri "$PublicOrigin/api/health" -TimeoutSec 20
  if (-not $health.ok -or -not $health.txline.credentialsConfigured) { throw 'Public health check or TxLINE credentials check failed' }
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
  $loggerScript = Join-Path $ProjectRoot 'scripts\record-live-sse.mjs'
  $loggerProcess = Start-Process -FilePath $node -ArgumentList @($loggerScript, $streamUrl, $stopAt.ToString('o')) -RedirectStandardOutput $eventsFile -RedirectStandardError $eventsErrorFile -WindowStyle Hidden -PassThru

  $segmentPattern = Join-Path $videoDir 'live-part-%03d.mp4'
  $profilePath = Join-Path $env:TEMP "pulseproof-headless-$RunName-$attemptId"
  @{
    pageUrl = "$PublicOrigin/?fixture=$FixtureId&liveCapture=1"
    videoPattern = $segmentPattern; durationSeconds = $DurationSeconds; frameRate = 5
    chromePath = $chrome; ffmpegPath = $ffmpeg; profilePath = $profilePath; resultFile = $recorderResult
  } | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 $recorderConfig
  $recorderScript = Join-Path $ProjectRoot 'scripts\headless-live-page-recorder.mjs'
  $recorderProcess = Start-Process -FilePath $node -ArgumentList @($recorderScript, $recorderConfig) -RedirectStandardOutput $recorderOutput -RedirectStandardError $workerLog -WindowStyle Hidden -PassThru
  Write-State 'recording' @{
    startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); loggerPid = $loggerProcess.Id
    recorderPid = $recorderProcess.Id; videoPattern = $segmentPattern; eventsFile = $eventsFile
  }
  $recorderProcess.WaitForExit()
  if (-not (Test-Path $recorderResult)) { throw 'Headless recorder stopped without a result file' }
  $result = Get-Content -Raw $recorderResult | ConvertFrom-Json
  if ($result.status -ne 'completed') { throw "Headless recorder failed: $($result.error)" }
  Write-State 'completed' @{
    startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); recorderResult = $result
  }
} catch {
  Write-State 'failed' @{ startedAt = $startedAt.ToString('o'); stopAt = $stopAt.ToString('o'); error = $_.Exception.Message }
  throw
} finally {
  if ($loggerProcess -and -not $loggerProcess.HasExited) { Stop-Process -Id $loggerProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($recorderProcess -and -not $recorderProcess.HasExited) { Stop-Process -Id $recorderProcess.Id -Force -ErrorAction SilentlyContinue }
  [PulseProofCapturePower]::SetThreadExecutionState($ES_CONTINUOUS) | Out-Null
}
