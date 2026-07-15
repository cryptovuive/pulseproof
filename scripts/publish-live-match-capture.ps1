param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DestinationDirectory = 'C:\Users\ducth\Downloads\video',
  [string]$PrimaryRunName = 'england-argentina-2026-07-16',
  [string]$BackupRunName = 'england-argentina-2026-07-16-backup',
  [int]$MinimumVideoSeconds = 7200,
  [string]$Repository = 'cryptovuive/pulseproof',
  [string]$Workflow = 'england-argentina-live-capture.yml'
)

$ErrorActionPreference = 'Stop'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
if (-not (Test-Path $ffprobe)) { throw "Missing required binary: $ffprobe" }
$finalizer = Join-Path $ProjectRoot 'scripts\finalize-live-match-capture.ps1'
$errors = [System.Collections.ArrayList]::new()

function Read-Candidate([string]$manifestPath, [string]$sourceLabel, [string]$runName) {
  if (-not (Test-Path $manifestPath)) { return $null }
  $manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
  if (-not $manifest.captureCompleted) { return $null }
  $videoPath = Join-Path (Split-Path -Parent $manifestPath) $manifest.assembledVideo.file
  if (-not (Test-Path $videoPath)) { throw "Manifest video is missing: $videoPath" }
  $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $videoPath)
  if ($LASTEXITCODE -ne 0 -or $duration -lt $MinimumVideoSeconds) { throw "Candidate $runName has only $duration seconds" }
  $hash = (Get-FileHash -Algorithm SHA256 $videoPath).Hash.ToLowerInvariant()
  $expectedHash = [string]$manifest.assembledVideo.sha256
  if ($expectedHash -and $hash -ne $expectedHash.ToLowerInvariant()) { throw "Candidate hash mismatch for $runName" }
  return [pscustomobject]@{
    source = $sourceLabel; runName = $runName; manifestPath = $manifestPath; videoPath = $videoPath
    durationSeconds = $duration; sha256 = $hash; uninterrupted = $manifest.uninterrupted -eq $true
    sseEventCount = $manifest.sseEventCount
  }
}

$candidates = @()
foreach ($runName in @($PrimaryRunName, $BackupRunName)) {
  try {
    $runDir = Join-Path $ProjectRoot "submission-assets\live-match\$runName"
    $manifestPath = Join-Path $runDir 'capture-manifest.json'
    if (-not (Test-Path $manifestPath)) {
      $statePath = Join-Path $runDir 'capture-state.json'
      if (Test-Path $statePath) {
        $state = Get-Content -Raw $statePath | ConvertFrom-Json
        if ($state.status -eq 'completed') {
          & $finalizer -ProjectRoot $ProjectRoot -RunName $runName -MinimumVideoSeconds $MinimumVideoSeconds | Out-Null
        }
      }
    }
    $candidate = Read-Candidate $manifestPath 'local-recorder' $runName
    if ($candidate) { $candidates += $candidate }
  } catch {
    $errors.Add("$runName`: $($_.Exception.Message)") | Out-Null
  }
}

if (-not $candidates.Count) {
  try {
    $gh = (Get-Command gh.exe -ErrorAction Stop).Source
    $runs = & $gh run list --repo $Repository --workflow $Workflow --event schedule --limit 5 --json databaseId,status,conclusion,createdAt | ConvertFrom-Json
    $remoteRun = @($runs | Where-Object { $_.status -eq 'completed' -and $_.conclusion -eq 'success' } | Sort-Object createdAt -Descending) | Select-Object -First 1
    if (-not $remoteRun) { throw 'No successful scheduled GitHub capture run is available yet' }
    $artifacts = & $gh api "repos/$Repository/actions/runs/$($remoteRun.databaseId)/artifacts" | ConvertFrom-Json
    $artifact = @($artifacts.artifacts | Where-Object { -not $_.expired -and $_.name -like 'england-argentina-live-capture-*' }) | Select-Object -First 1
    if (-not $artifact) { throw "No capture artifact exists for GitHub run $($remoteRun.databaseId)" }
    $downloadDir = Join-Path $ProjectRoot "submission-assets\live-match\github-delivery-$($remoteRun.databaseId)"
    $remoteManifest = Get-ChildItem -LiteralPath $downloadDir -Recurse -Filter 'capture-manifest.json' -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $remoteManifest) {
      New-Item -ItemType Directory -Force $downloadDir | Out-Null
      & $gh run download $remoteRun.databaseId --repo $Repository -n $artifact.name -D $downloadDir
      if ($LASTEXITCODE -ne 0) { throw "Could not download GitHub artifact $($artifact.name)" }
      $remoteManifest = Get-ChildItem -LiteralPath $downloadDir -Recurse -Filter 'capture-manifest.json' | Select-Object -First 1
    }
    if (-not $remoteManifest) { throw 'Downloaded GitHub artifact does not contain capture-manifest.json' }
    $candidate = Read-Candidate $remoteManifest.FullName 'github-hosted-recorder' "github-$($remoteRun.databaseId)"
    if ($candidate) { $candidates += $candidate }
  } catch {
    $errors.Add("github-fallback`: $($_.Exception.Message)") | Out-Null
  }
}

if (-not $candidates.Count) { throw "No verified full-match video is ready. $($errors -join ' | ')" }
$chosen = $candidates | Sort-Object @{ Expression = 'uninterrupted'; Descending = $true }, @{ Expression = 'durationSeconds'; Descending = $true } | Select-Object -First 1
New-Item -ItemType Directory -Force $DestinationDirectory | Out-Null
$fileStem = 'PulseProof-England-vs-Argentina-Live-2026-07-16'
$destinationVideo = Join-Path $DestinationDirectory "$fileStem.mp4"
$partialVideo = "$destinationVideo.partial"
Copy-Item -LiteralPath $chosen.videoPath -Destination $partialVideo -Force
$deliveredDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $partialVideo)
if ($LASTEXITCODE -ne 0 -or [Math]::Abs($deliveredDuration - $chosen.durationSeconds) -gt 2) { throw 'Delivered copy failed FFprobe duration validation' }
$deliveredHash = (Get-FileHash -Algorithm SHA256 $partialVideo).Hash.ToLowerInvariant()
if ($deliveredHash -ne $chosen.sha256) { throw 'Delivered copy failed SHA-256 validation' }
Move-Item -LiteralPath $partialVideo -Destination $destinationVideo -Force
$destinationManifest = Join-Path $DestinationDirectory "$fileStem.manifest.json"
Copy-Item -LiteralPath $chosen.manifestPath -Destination $destinationManifest -Force
$report = @{
  deliveredAt = (Get-Date).ToUniversalTime().ToString('o'); status = 'verified'; fixtureId = 18241006
  match = 'England vs Argentina'; source = $chosen.source; sourceRun = $chosen.runName
  video = $destinationVideo; manifest = $destinationManifest; durationSeconds = [Math]::Round($deliveredDuration, 3)
  bytes = (Get-Item $destinationVideo).Length; sha256 = $deliveredHash; uninterrupted = $chosen.uninterrupted
  sseEventCount = $chosen.sseEventCount; rejectedCandidates = @($errors)
}
$reportPath = Join-Path $DestinationDirectory "$fileStem.delivery.json"
$reportTemp = "$reportPath.tmp"
$report | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $reportTemp
Move-Item -LiteralPath $reportTemp -Destination $reportPath -Force
$report | ConvertTo-Json -Depth 8
