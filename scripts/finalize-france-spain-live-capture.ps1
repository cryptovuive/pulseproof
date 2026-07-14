param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$RunName = 'france-spain-2026-07-15'
)

$ErrorActionPreference = 'Stop'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
if (-not (Test-Path $ffprobe)) { throw "Missing required binary: $ffprobe" }
$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
$stateFile = Join-Path $runDir 'capture-state.json'
if (-not (Test-Path $stateFile)) { throw "Capture state is missing: $stateFile" }
$state = Get-Content -Raw $stateFile | ConvertFrom-Json
$segments = @(Get-ChildItem -LiteralPath $runDir -Recurse -Filter '*.mp4' | Sort-Object FullName)
if (-not $segments.Count) { throw 'No live capture video segments were produced' }
$video = @(foreach ($segment in $segments) {
  $duration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $segment.FullName)
  if ($LASTEXITCODE -ne 0 -or $duration -le 0) { throw "Invalid video segment: $($segment.FullName)" }
  $hash = (Get-FileHash -Algorithm SHA256 $segment.FullName).Hash.ToLowerInvariant()
  $relative = $segment.FullName.Substring($runDir.Length + 1)
  [pscustomobject]@{ file = $relative; durationSeconds = [Math]::Round($duration, 3); bytes = $segment.Length; sha256 = $hash }
})
$eventFiles = @(Get-ChildItem -LiteralPath $runDir -Recurse -Filter 'events.ndjson')
$events = @()
foreach ($eventsFile in $eventFiles) {
  $events += @(Get-Content $eventsFile.FullName | ForEach-Object { try { $_ | ConvertFrom-Json } catch { $null } } | Where-Object { $_ -and $_.kind -eq 'event' })
}
$totalVideoSeconds = ($video | ForEach-Object { $_.durationSeconds } | Measure-Object -Sum).Sum
$summary = @{
  finalizedAt = (Get-Date).ToUniversalTime().ToString('o')
  captureState = $state
  segmentCount = @($video).Count
  totalVideoSeconds = [Math]::Round($totalVideoSeconds, 3)
  sseEventCount = $events.Count
  sseEventTypes = @($events | Group-Object event | ForEach-Object { @{ event = $_.Name; count = $_.Count } })
  video = $video
  immutableEvidence = 'SHA-256 hashes bind each captured segment to this manifest.'
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $runDir 'capture-manifest.json')
$summary | ConvertTo-Json -Depth 8
