param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PublicOrigin = 'https://pulseproof-production-06fa.up.railway.app',
  [int]$FixtureId = 18237038,
  [int]$DurationSeconds = 12600,
  [string]$RunName = 'france-spain-2026-07-15'
)

$ErrorActionPreference = 'Stop'
$worker = Join-Path $PSScriptRoot 'capture-live-match-worker.ps1'
$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
New-Item -ItemType Directory -Force $runDir | Out-Null
$stateFile = Join-Path $runDir 'capture-state.json'
if (Test-Path $stateFile) {
  $state = Get-Content -Raw $stateFile | ConvertFrom-Json
  if ($state.status -eq 'recording' -and (Get-Process -Id $state.workerPid -ErrorAction SilentlyContinue)) {
    throw "A live capture is already recording under worker PID $($state.workerPid)"
  }
}

$stdout = Join-Path $runDir 'launcher-output.log'
$stderr = Join-Path $runDir 'launcher-error.log'
$arguments = @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $worker,
  '-ProjectRoot', $ProjectRoot, '-PublicOrigin', $PublicOrigin,
  '-FixtureId', "$FixtureId", '-DurationSeconds', "$DurationSeconds", '-RunName', $RunName
)
$process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
@{
  requestedAt = (Get-Date).ToUniversalTime().ToString('o')
  workerPid = $process.Id
  fixtureId = $FixtureId
  durationSeconds = $DurationSeconds
  publicOrigin = $PublicOrigin
} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $runDir 'capture-request.json')
Write-Output "CAPTURE_WORKER_PID=$($process.Id)"
Write-Output "CAPTURE_RUN_DIR=$runDir"
