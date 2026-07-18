param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DestinationDirectory = 'C:\Users\ducth\Downloads\video'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
foreach ($binary in @($ffmpeg, $ffprobe)) {
  if (-not (Test-Path $binary)) { throw "Missing required binary: $binary" }
}

$assetRoot = Join-Path $ProjectRoot 'submission-assets\video'
$sceneFile = Join-Path $assetRoot 'v5-scenes.json'
$audioDir = Join-Path $assetRoot 'v5-audio'
$segmentDir = Join-Path $assetRoot 'v5-segments'
New-Item -ItemType Directory -Force $DestinationDirectory, $audioDir, $segmentDir | Out-Null
$output = Join-Path $DestinationDirectory 'PulseProof-Submission-Final-v5.mp4'
$vttOutput = Join-Path $DestinationDirectory 'PulseProof-Submission-Final-v5.en.vtt'
$transcriptOutput = Join-Path $DestinationDirectory 'PulseProof-Submission-Final-v5.transcript.txt'
$thumbnailOutput = Join-Path $DestinationDirectory 'PulseProof-Submission-Final-v5-thumbnail.png'
$manifestOutput = Join-Path $DestinationDirectory 'PulseProof-Submission-Final-v5.manifest.json'

$scenes = Get-Content -Raw -Encoding UTF8 $sceneFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice('Microsoft David Desktop')
$synth.Rate = 1
$synth.Volume = 100

function Format-VttTime([double]$seconds) {
  $span = [TimeSpan]::FromSeconds($seconds)
  return '{0:00}:{1:00}:{2:00}.{3:000}' -f [Math]::Floor($span.TotalHours), $span.Minutes, $span.Seconds, $span.Milliseconds
}

function Add-NarrationCaptions(
  [System.Collections.Generic.List[string]]$Lines,
  [double]$SceneStart,
  [double]$AudioDuration,
  [string]$Text
) {
  $sentences = @([regex]::Matches($Text, '[^.!?]+[.!?]?') | ForEach-Object { $_.Value.Trim() } | Where-Object { $_ })
  if ($sentences.Count -eq 0) { return }
  $weights = @($sentences | ForEach-Object { [Math]::Max(1, ($_.Split(' ', [StringSplitOptions]::RemoveEmptyEntries)).Count) })
  $totalWeight = ($weights | Measure-Object -Sum).Sum
  $captionCursor = $SceneStart + 0.1
  $usable = [Math]::Max(0.8, $AudioDuration - 0.1)
  for ($i = 0; $i -lt $sentences.Count; $i++) {
    $share = $usable * ($weights[$i] / $totalWeight)
    $captionEnd = $captionCursor + $share
    $Lines.Add("$(Format-VttTime $captionCursor) --> $(Format-VttTime $captionEnd)")
    $Lines.Add($sentences[$i])
    $Lines.Add('')
    $captionCursor = $captionEnd
  }
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
  $stem = 'v5-scene-{0:D2}' -f ($index + 1)
  $wav = Join-Path $audioDir "$stem.wav"
  $segment = Join-Path $segmentDir "$stem.mp4"
  $source = Join-Path $assetRoot ([string]$scene.source)
  $duration = [double]$scene.duration
  $sourceStart = if ($null -ne $scene.sourceStart) { [double]$scene.sourceStart } else { 0.0 }
  if (-not (Test-Path $source)) { throw "Missing V5 scene source: $source" }

  $synth.SetOutputToWaveFile($wav)
  $synth.Speak([string]$scene.text)
  $synth.SetOutputToNull()
  $audioDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $wav)
  if ($audioDuration -gt ($duration - 0.35)) {
    throw "$stem narration is $audioDuration seconds but the scene is only $duration seconds"
  }

  $fadeOut = [Math]::Max(0.5, $duration - 0.35)
  $layoutFilter = if ([string]$scene.layout -eq 'desktop') {
    'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'
  } else {
    'crop=1920:864:0:176,pad=1920:1080:0:108:black'
  }
  $filter = "$layoutFilter,fade=t=in:st=0:d=0.18,fade=t=out:st=$fadeOut`:d=0.35,format=yuv420p"
  $arguments = @('-hide_banner', '-loglevel', 'error', '-y')
  if ($sourceStart -gt 0) { $arguments += @('-ss', [string]$sourceStart) }
  $arguments += @('-i', $source, '-i', $wav, '-t', [string]$duration, '-vf', $filter,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', '30',
    '-c:a', 'aac', '-b:a', '160k', '-af', "apad=whole_dur=$duration", '-movflags', '+faststart', $segment)
  & $ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for $stem" }

  $concatLines.Add("file '$($segment.Replace("'", "''"))'")
  $startMs = [Math]::Round($cursor * 1000)
  $endMs = [Math]::Round(($cursor + $duration) * 1000)
  $metadataLines.Add('[CHAPTER]')
  $metadataLines.Add('TIMEBASE=1/1000')
  $metadataLines.Add("START=$startMs")
  $metadataLines.Add("END=$endMs")
  $metadataLines.Add("title=$($scene.title)")
  Add-NarrationCaptions -Lines $vttLines -SceneStart $cursor -AudioDuration $audioDuration -Text ([string]$scene.text)
  $transcriptLines.Add(('{0}. {1}' -f ($index + 1), $scene.title))
  $transcriptLines.Add([string]$scene.text)
  $transcriptLines.Add('')
  $cursor += $duration
}
$synth.Dispose()

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$concatFile = Join-Path $segmentDir 'concat.txt'
$metadataFile = Join-Path $segmentDir 'chapters.ffmeta'
$joined = Join-Path $segmentDir 'joined.mp4'
[System.IO.File]::WriteAllLines($concatFile, $concatLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($metadataFile, $metadataLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($vttOutput, $vttLines, $utf8NoBom)
[System.IO.File]::WriteAllLines($transcriptOutput, $transcriptLines, $utf8NoBom)

& $ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i $concatFile -c copy $joined
if ($LASTEXITCODE -ne 0) { throw 'Unable to concatenate V5 scenes' }
& $ffmpeg -hide_banner -loglevel error -y -i $joined -i $metadataFile -map 0 -map_metadata 1 -c copy -movflags +faststart $output
if ($LASTEXITCODE -ne 0) { throw 'Unable to attach V5 chapter metadata' }
& $ffmpeg -hide_banner -loglevel error -y -ss 00:00:07 -i $output -frames:v 1 $thumbnailOutput
if ($LASTEXITCODE -ne 0) { throw 'Unable to render V5 thumbnail' }

$finalDuration = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $output)
if ($finalDuration -ge 300) { throw "Final V5 video is $finalDuration seconds; it must stay below five minutes" }
$hash = (Get-FileHash -Algorithm SHA256 $output).Hash.ToLowerInvariant()
[pscustomobject]@{
  title = 'PulseProof - Live Football Context, Community and Verifiable Fan Identity'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  video = $output
  captions = $vttOutput
  transcript = $transcriptOutput
  thumbnail = $thumbnailOutput
  voice = 'Microsoft David Desktop'
  captionLanguage = 'en'
  durationSeconds = [Math]::Round($finalDuration, 3)
  scenes = $scenes.Count
  sha256 = $hash
} | ConvertTo-Json | Set-Content -Encoding UTF8 $manifestOutput

Write-Output "VIDEO=$output"
Write-Output ('DURATION={0:N3}' -f $finalDuration)
Write-Output "SCENES=$($scenes.Count)"
Write-Output "SHA256=$hash"
