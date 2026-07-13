param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
if (-not (Test-Path $ffmpeg) -or -not (Test-Path $ffprobe)) { throw 'FFmpeg and FFprobe are required under C:\ffmpeg\bin' }

$assetRoot = Join-Path $ProjectRoot 'submission-assets\video'
$processed = Join-Path $assetRoot 'processed'
$audioDir = Join-Path $assetRoot 'audio'
$segmentDir = Join-Path $assetRoot 'segments'
$sceneFile = Join-Path $assetRoot 'narration-scenes.json'
$output = Join-Path $ProjectRoot 'public\pulseproof-demo.mp4'
$vttOutput = Join-Path $ProjectRoot 'public\pulseproof-demo.vtt'
$transcriptOutput = Join-Path $ProjectRoot 'public\pulseproof-demo-transcript.txt'

New-Item -ItemType Directory -Force $audioDir, $segmentDir | Out-Null
$scenes = Get-Content -Raw -Encoding UTF8 $sceneFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft Zira Desktop')
$synth.Rate = 2
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
  $number = $index + 1
  $stem = 'scene-{0:D2}' -f $number
  $wav = Join-Path $audioDir "$stem.wav"
  $segment = Join-Path $segmentDir "$stem.mp4"
  $frame = Join-Path $processed $scenes[$index].frame
  if (-not (Test-Path $frame)) { throw "Missing processed frame: $frame" }

  $synth.SetOutputToWaveFile($wav)
  $synth.Speak([string]$scenes[$index].text)
  $synth.SetOutputToNull()

  $audioDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wav)
  $duration = [Math]::Ceiling(($audioDuration + 1.15) * 1000) / 1000
  $fadeOut = [Math]::Max(0.5, $duration - 0.55)
  $filter = "scale=1920:1080,fade=t=in:st=0:d=0.45,fade=t=out:st=$fadeOut`:d=0.55,format=yuv420p"

  & $ffmpeg -loglevel error -y -loop 1 -framerate 30 -i $frame -i $wav -t $duration -vf $filter -c:v libx264 -preset medium -crf 20 -r 30 -c:a aac -b:a 160k -af 'apad=pad_dur=1.15' -movflags +faststart $segment
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for $stem" }

  $concatLines.Add("file '$($segment.Replace("'", "''"))'")
  $startMs = [Math]::Round($cursor * 1000)
  $endMs = [Math]::Round(($cursor + $duration) * 1000)
  $metadataLines.Add('[CHAPTER]')
  $metadataLines.Add('TIMEBASE=1/1000')
  $metadataLines.Add("START=$startMs")
  $metadataLines.Add("END=$endMs")
  $metadataLines.Add("title=$($scenes[$index].title)")
  $vttLines.Add("$(Format-VttTime $cursor) --> $(Format-VttTime ($cursor + $duration))")
  $vttLines.Add([string]$scenes[$index].caption)
  $vttLines.Add('')
  $transcriptLines.Add(('{0}. {1}' -f $number, $scenes[$index].title))
  $transcriptLines.Add([string]$scenes[$index].text)
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
if ($LASTEXITCODE -ne 0) { throw 'Unable to concatenate video segments' }
& $ffmpeg -loglevel error -y -i $joined -i $metadataFile -map 0 -map_metadata 1 -c copy -movflags +faststart $output
if ($LASTEXITCODE -ne 0) { throw 'Unable to attach video chapter metadata' }

$finalDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $output)
if ($finalDuration -ge 300) { throw "Final video is $finalDuration seconds; it must stay below five minutes" }
Write-Output ('VIDEO={0}' -f $output)
Write-Output ('DURATION={0:N3}' -f $finalDuration)
Write-Output ('SCENES={0}' -f $scenes.Count)
