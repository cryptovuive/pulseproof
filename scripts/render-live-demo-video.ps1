param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PublicOrigin = 'https://pulseproof-production-06fa.up.railway.app',
  [switch]$SkipCapture
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
Add-Type -AssemblyName System.Windows.Forms

$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
foreach ($binary in @($ffmpeg, $ffprobe, $chrome)) {
  if (-not (Test-Path $binary)) { throw "Missing required binary: $binary" }
}
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
if ($screen.Width -ne 1920 -or $screen.Height -ne 1080) {
  throw "Primary display must be 1920x1080 for a deterministic capture; found $($screen.Width)x$($screen.Height)"
}

$assetRoot = Join-Path $ProjectRoot 'submission-assets\video'
$captureDir = Join-Path $assetRoot 'live-captures'
$audioDir = Join-Path $assetRoot 'live-audio'
$segmentDir = Join-Path $assetRoot 'live-segments'
$sceneFile = Join-Path $assetRoot 'live-demo-scenes.json'
$output = Join-Path $ProjectRoot 'public\pulseproof-demo.mp4'
$vttOutput = Join-Path $ProjectRoot 'public\pulseproof-demo.vtt'
$transcriptOutput = Join-Path $ProjectRoot 'public\pulseproof-demo-transcript.txt'
$thumbnailOutput = Join-Path $ProjectRoot 'public\pulseproof-demo-thumbnail.png'
New-Item -ItemType Directory -Force $captureDir, $audioDir, $segmentDir | Out-Null

function Stop-CaptureChrome([string]$profilePath) {
  Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq 'chrome.exe' -and $_.CommandLine -like "*$profilePath*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Capture-Browser([string]$url, [int]$seconds, [string]$target, [string]$name) {
  $profilePath = Join-Path $env:TEMP ("pulseproof-video-$name-" + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force $profilePath | Out-Null
  $arguments = @(
    "--user-data-dir=$profilePath",
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--disable-features=Translate,PasswordLeakDetection',
    '--force-device-scale-factor=1',
    '--window-position=0,0',
    '--window-size=1920,1080',
    '--kiosk',
    $url
  )
  try {
    Start-Process -FilePath $chrome -ArgumentList $arguments | Out-Null
    Start-Sleep -Seconds 4
    & $ffmpeg -loglevel error -y -f gdigrab -draw_mouse 0 -framerate 30 -video_size 1920x1080 -i desktop -t $seconds -an -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p $target
    if ($LASTEXITCODE -ne 0) { throw "Screen capture failed for $name" }
  } finally {
    Stop-CaptureChrome $profilePath
  }
}

if (-not $SkipCapture) {
  Capture-Browser "$PublicOrigin/?fixture=18198205&judgeDemo=1&demoDelay=6000" 64 (Join-Path $captureDir 'product-walkthrough.mp4') 'product'
  Capture-Browser "$PublicOrigin/submission?liveProof=1&proofDelay=6000#live-proof" 26 (Join-Path $captureDir 'live-proof-runner.mp4') 'proof'
  $signature = 'vid5hzmuF2FJnzFvZa7251fLdh5d5eRrn4WyvPd85WVKAcnccBbJhKEUFXx5VAXgvBEYp9bjZcToSp5yfnJHHCR'
  Capture-Browser "https://explorer.solana.com/tx/$signature`?cluster=devnet" 18 (Join-Path $captureDir 'explorer-receipt.mp4') 'explorer'
}

$scenes = Get-Content -Raw -Encoding UTF8 $sceneFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$synth.Rate = 1
$synth.Volume = 100

function Format-VttTime([double]$seconds) {
  $span = [TimeSpan]::FromSeconds($seconds)
  return '{0:00}:{1:00}:{2:00}.{3:000}' -f [Math]::Floor($span.TotalHours), $span.Minutes, $span.Seconds, $span.Milliseconds
}

$concatLines = New-Object System.Collections.Generic.List[string]
$metadataLines = New-Object System.Collections.Generic.List[string]
$metadataLines.Add(';FFMETADATA1')
$vttLines = New-Object System.Collections.Generic.List[string]
$vttLines.Add('WEBVTT')
$vttLines.Add('')
$transcriptLines = New-Object System.Collections.Generic.List[string]
$cursor = 0.0

for ($index = 0; $index -lt $scenes.Count; $index++) {
  $scene = $scenes[$index]
  $stem = 'live-scene-{0:D2}' -f ($index + 1)
  $wav = Join-Path $audioDir "$stem.wav"
  $segment = Join-Path $segmentDir "$stem.mp4"
  $source = Join-Path $assetRoot ([string]$scene.source)
  $duration = [double]$scene.duration
  if (-not (Test-Path $source)) { throw "Missing scene source: $source" }

  $synth.SetOutputToWaveFile($wav)
  $synth.Speak([string]$scene.text)
  $synth.SetOutputToNull()
  $audioDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wav)
  if ($audioDuration -gt ($duration - 0.5)) { throw "$stem narration is $audioDuration seconds but scene is only $duration seconds" }
  $fadeOut = [Math]::Max(0.5, $duration - 0.45)
  $filter = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fade=t=in:st=0:d=0.3,fade=t=out:st=$fadeOut`:d=0.45,format=yuv420p"

  if ($scene.kind -eq 'still') {
    & $ffmpeg -loglevel error -y -loop 1 -framerate 30 -i $source -i $wav -t $duration -vf $filter -c:v libx264 -preset medium -crf 19 -r 30 -c:a aac -b:a 160k -af "apad=whole_dur=$duration" -movflags +faststart $segment
  } else {
    & $ffmpeg -loglevel error -y -i $source -i $wav -t $duration -vf $filter -c:v libx264 -preset medium -crf 19 -r 30 -c:a aac -b:a 160k -af "apad=whole_dur=$duration" -movflags +faststart $segment
  }
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for $stem" }

  $concatLines.Add("file '$($segment.Replace("'", "''"))'")
  $startMs = [Math]::Round($cursor * 1000)
  $endMs = [Math]::Round(($cursor + $duration) * 1000)
  $metadataLines.Add('[CHAPTER]')
  $metadataLines.Add('TIMEBASE=1/1000')
  $metadataLines.Add("START=$startMs")
  $metadataLines.Add("END=$endMs")
  $metadataLines.Add("title=$($scene.title)")
  $vttLines.Add("$(Format-VttTime $cursor) --> $(Format-VttTime ($cursor + $duration))")
  $vttLines.Add([string]$scene.caption)
  $vttLines.Add('')
  $transcriptLines.Add(('{0}. {1}' -f ($index + 1), $scene.title))
  $transcriptLines.Add([string]$scene.text)
  $transcriptLines.Add('')
  $cursor += $duration
}
$synth.Dispose()

$concatFile = Join-Path $segmentDir 'concat.txt'
$metadataFile = Join-Path $segmentDir 'chapters.ffmeta'
$joined = Join-Path $segmentDir 'joined.mp4'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($concatFile, $concatLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($metadataFile, $metadataLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($vttOutput, $vttLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($transcriptOutput, $transcriptLines, $utf8NoBom)

& $ffmpeg -loglevel error -y -f concat -safe 0 -i $concatFile -c copy $joined
if ($LASTEXITCODE -ne 0) { throw 'Unable to concatenate live demo segments' }
& $ffmpeg -loglevel error -y -i $joined -i $metadataFile -map 0 -map_metadata 1 -c copy -movflags +faststart $output
if ($LASTEXITCODE -ne 0) { throw 'Unable to attach live demo chapter metadata' }
& $ffmpeg -loglevel error -y -ss 00:00:28 -i $output -frames:v 1 $thumbnailOutput
if ($LASTEXITCODE -ne 0) { throw 'Unable to render the live demo thumbnail' }

$finalDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $output)
if ($finalDuration -ge 300) { throw "Final video is $finalDuration seconds; it must stay below five minutes" }
Write-Output "VIDEO=$output"
Write-Output ('DURATION={0:N3}' -f $finalDuration)
Write-Output "LIVE_SCENES=$($scenes.Count)"
