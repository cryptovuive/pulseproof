param(
  [string]$ProjectRoot,
  [string]$PublicOrigin,
  [int]$FixtureId,
  [string]$ExpectedHome,
  [string]$ExpectedAway,
  [string]$RunName,
  [string]$StopAtUtc
)

$ErrorActionPreference = 'Stop'
$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
New-Item -ItemType Directory -Force $runDir | Out-Null
$watchdogLog = Join-Path $runDir 'watchdog.ndjson'
function Log([string]$status, [string]$detail) {
  @{ at = (Get-Date).ToUniversalTime().ToString('o'); status = $status; detail = $detail } |
    ConvertTo-Json -Compress | Add-Content -Encoding utf8 $watchdogLog
}
$stopAt = [DateTimeOffset]::Parse($StopAtUtc).UtcDateTime
$remaining = [Math]::Floor(($stopAt - (Get-Date).ToUniversalTime()).TotalSeconds)
if ($remaining -lt 10) { Log 'window-closed' 'Capture deadline has passed'; exit 0 }
$stateFile = Join-Path $runDir 'capture-state.json'
if (Test-Path $stateFile) {
  try { $state = Get-Content -Raw $stateFile | ConvertFrom-Json } catch { Log 'restart' 'Capture state was unreadable'; $state = $null }
  if ($state -and $state.status -eq 'recording' -and (Get-Process -Id $state.workerPid -ErrorAction SilentlyContinue)) {
    $stateAge = ((Get-Date).ToUniversalTime() - [DateTimeOffset]::Parse($state.updatedAt).UtcDateTime).TotalSeconds
    if ($stateAge -le 75) {
      Log 'healthy' "Worker $($state.workerPid) is recording attempt $($state.attemptId); state age $([Math]::Round($stateAge, 1))s"; exit 0
    }
    Log 'stale' "Worker $($state.workerPid) stopped publishing liveness for $([Math]::Round($stateAge, 1))s"
    foreach ($processId in @($state.recorderPid, $state.loggerPid, $state.workerPid)) {
      if ($processId) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }
    }
    Start-Sleep -Seconds 2
  }
  if ($state -and $state.status -eq 'completed') { Log 'completed' 'Capture reached its configured stop time'; exit 0 }
  if ($state) { Log 'restart' "Previous state was $($state.status): $($state.error)" }
}
$start = Join-Path $ProjectRoot 'scripts\start-live-match-capture.ps1'
& $start -ProjectRoot $ProjectRoot -PublicOrigin $PublicOrigin -FixtureId $FixtureId -ExpectedHome $ExpectedHome -ExpectedAway $ExpectedAway -DurationSeconds $remaining -RunName $RunName | Out-Null
Start-Sleep -Seconds 15
if (-not (Test-Path $stateFile)) { Log 'failed' 'Worker did not create capture-state.json'; exit 1 }
$next = Get-Content -Raw $stateFile | ConvertFrom-Json
if ($next.status -notin @('recording', 'completed')) { Log 'failed' "Worker state is $($next.status): $($next.error)"; exit 1 }
Log 'started' "Worker $($next.workerPid) started attempt $($next.attemptId)"
