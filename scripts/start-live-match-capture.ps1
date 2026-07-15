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
if (-not $FixtureId -or -not $ExpectedHome -or -not $ExpectedAway -or -not $RunName) { throw 'FixtureId, ExpectedHome, ExpectedAway and RunName are required' }
$worker = Join-Path $PSScriptRoot 'capture-live-match-worker.ps1'
$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
New-Item -ItemType Directory -Force $runDir | Out-Null
$stateFile = Join-Path $runDir 'capture-state.json'
if (Test-Path $stateFile) {
  $state = Get-Content -Raw $stateFile | ConvertFrom-Json
  if ($state.status -eq 'recording' -and (Get-Process -Id $state.workerPid -ErrorAction SilentlyContinue)) {
    Write-Output "CAPTURE_ALREADY_RUNNING=$($state.workerPid)"
    exit 0
  }
}

$launcherDir = Join-Path $runDir 'launchers'
New-Item -ItemType Directory -Force $launcherDir | Out-Null
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmssfff')
$stdout = Join-Path $launcherDir "$stamp-output.log"
$stderr = Join-Path $launcherDir "$stamp-error.log"
$arguments = @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $worker,
  '-ProjectRoot', $ProjectRoot, '-PublicOrigin', $PublicOrigin, '-FixtureId', "$FixtureId",
  '-ExpectedHome', $ExpectedHome, '-ExpectedAway', $ExpectedAway,
  '-DurationSeconds', "$DurationSeconds", '-RunName', $RunName
)
$process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -RedirectStandardOutput $stdout -RedirectStandardError $stderr -WindowStyle Hidden -PassThru
@{
  requestedAt = (Get-Date).ToUniversalTime().ToString('o'); workerPid = $process.Id; fixtureId = $FixtureId
  expectedHome = $ExpectedHome; expectedAway = $ExpectedAway; durationSeconds = $DurationSeconds; publicOrigin = $PublicOrigin
} | ConvertTo-Json -Compress | Add-Content -Encoding utf8 (Join-Path $runDir 'capture-requests.ndjson')
Write-Output "CAPTURE_WORKER_PID=$($process.Id)"
Write-Output "CAPTURE_RUN_DIR=$runDir"
