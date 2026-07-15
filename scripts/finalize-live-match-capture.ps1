param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [Parameter(Mandatory = $true)][string]$RunName,
  [int]$MinimumVideoSeconds = 7200
)

$ErrorActionPreference = 'Stop'
$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
foreach ($binary in @($ffmpeg, $ffprobe)) { if (-not (Test-Path $binary)) { throw "Missing required binary: $binary" } }
$runDir = Join-Path $ProjectRoot "submission-assets\live-match\$RunName"
$stateFile = Join-Path $runDir 'capture-state.json'
if (-not (Test-Path $stateFile)) { throw "Capture state is missing: $stateFile" }
$state = Get-Content -Raw $stateFile | ConvertFrom-Json
$fullVideo = Join-Path $runDir "$RunName-full.mp4"
$segments = @(Get-ChildItem -LiteralPath $runDir -Recurse -Filter '*.mp4' | Where-Object { $_.FullName -ne $fullVideo } | Sort-Object FullName)
if (-not $segments.Count) { throw 'No live capture video segments were produced' }

$video = @(foreach ($segment in $segments) {
  $probe = (& $ffprobe -v error -show_entries stream=codec_name,width,height -show_entries format=duration,bit_rate -of json $segment.FullName) | ConvertFrom-Json
  $duration = [double]$probe.format.duration
  if ($LASTEXITCODE -ne 0 -or $duration -le 0) { throw "Invalid video segment: $($segment.FullName)" }
  $hash = (Get-FileHash -Algorithm SHA256 $segment.FullName).Hash.ToLowerInvariant()
  $relative = $segment.FullName.Substring($runDir.Length + 1)
  [pscustomobject]@{
    file = $relative; durationSeconds = [Math]::Round($duration, 3); bytes = $segment.Length; sha256 = $hash
    codec = $probe.streams[0].codec_name; width = $probe.streams[0].width; height = $probe.streams[0].height
  }
})
$totalVideoSeconds = [double](($video | ForEach-Object { $_.durationSeconds } | Measure-Object -Sum).Sum)
if ($totalVideoSeconds -lt $MinimumVideoSeconds) { throw "Only $([Math]::Round($totalVideoSeconds, 1)) video seconds were captured; required $MinimumVideoSeconds" }

$concatFile = Join-Path $runDir 'concat-segments.txt'
$segments | ForEach-Object { "file '$($_.FullName.Replace('\', '/'))'" } | Set-Content -Encoding ascii $concatFile
& $ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $concatFile -fflags +genpts -avoid_negative_ts make_zero -c copy -movflags +faststart $fullVideo
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $fullVideo)) { throw 'FFmpeg could not assemble the full-match video' }
$fullDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $fullVideo)
if ($LASTEXITCODE -ne 0 -or $fullDuration -lt ($MinimumVideoSeconds - 2)) { throw "Assembled video duration is invalid: $fullDuration" }

$eventFiles = @(Get-ChildItem -LiteralPath $runDir -Recurse -Filter 'events*.ndjson')
$events = @()
foreach ($eventsFile in $eventFiles) {
  $events += @(Get-Content $eventsFile.FullName | ForEach-Object { try { $_ | ConvertFrom-Json } catch { $null } } | Where-Object { $_ -and $_.kind -eq 'event' })
}
$attemptResults = @(Get-ChildItem -LiteralPath $runDir -Recurse -Filter 'recorder-result.json' | ForEach-Object {
  try { Get-Content -Raw $_.FullName | ConvertFrom-Json } catch { $null }
} | Where-Object { $_ -and $_.startedAt } | Sort-Object { [DateTimeOffset]::Parse($_.startedAt) })
$coverageGapSeconds = 0.0
$rollingEnd = $null
foreach ($attempt in $attemptResults) {
  $attemptStart = [DateTimeOffset]::Parse($attempt.startedAt)
  $attemptEndText = if ($attempt.completedAt) { $attempt.completedAt } else { $attempt.failedAt }
  if (-not $attemptEndText) { continue }
  $attemptEnd = [DateTimeOffset]::Parse($attemptEndText)
  if ($rollingEnd -and $attemptStart -gt $rollingEnd) { $coverageGapSeconds += ($attemptStart - $rollingEnd).TotalSeconds }
  if (-not $rollingEnd -or $attemptEnd -gt $rollingEnd) { $rollingEnd = $attemptEnd }
}
$fullHash = (Get-FileHash -Algorithm SHA256 $fullVideo).Hash.ToLowerInvariant()
$summary = @{
  finalizedAt = (Get-Date).ToUniversalTime().ToString('o')
  captureState = $state
  captureCompleted = $state.status -eq 'completed'
  uninterrupted = ($attemptResults.Count -eq 1 -and $state.status -eq 'completed' -and $coverageGapSeconds -eq 0)
  attemptCount = $attemptResults.Count
  coverageGapSeconds = [Math]::Round($coverageGapSeconds, 3)
  segmentCount = @($video).Count
  totalSegmentSeconds = [Math]::Round($totalVideoSeconds, 3)
  assembledVideo = @{
    file = (Split-Path -Leaf $fullVideo); durationSeconds = [Math]::Round($fullDuration, 3)
    bytes = (Get-Item $fullVideo).Length; sha256 = $fullHash
  }
  sseEventCount = $events.Count
  sseEventTypes = @($events | Group-Object event | ForEach-Object { @{ event = $_.Name; count = $_.Count } })
  eventFiles = @($eventFiles | ForEach-Object { $_.FullName.Substring($runDir.Length + 1) })
  video = $video
  immutableEvidence = 'SHA-256 hashes bind every recoverable segment and the assembled full-match file to this manifest.'
}
$summary | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 (Join-Path $runDir 'capture-manifest.json')
$summary | ConvertTo-Json -Depth 10
