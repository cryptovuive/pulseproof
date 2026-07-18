param(
  [string]$Video = 'C:\Users\ducth\Downloads\video\PulseProof-Submission-Final-v5.mp4',
  [string]$Captions = 'C:\Users\ducth\Downloads\video\PulseProof-Submission-Final-v5.en.vtt',
  [string]$Manifest = 'C:\Users\ducth\Downloads\video\PulseProof-Submission-Final-v5.manifest.json'
)

$ErrorActionPreference = 'Stop'
$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
$ffprobe = 'C:\ffmpeg\bin\ffprobe.exe'
foreach ($path in @($ffmpeg, $ffprobe, $Video, $Captions)) {
  if (-not (Test-Path $path)) { throw "Missing required file: $path" }
}

$directory = Split-Path -Parent $Video
$stem = [IO.Path]::GetFileNameWithoutExtension($Video)
$clean = Join-Path $directory "$stem-clean.mp4"
$captioned = Join-Path $directory "$stem-captioned.tmp.mp4"
Copy-Item -LiteralPath $Video -Destination $clean -Force
if (Test-Path $captioned) { Remove-Item -LiteralPath $captioned -Force }

$escapedCaptions = $Captions.Replace('\', '/').Replace(':', '\:').Replace("'", "\'")
$style = 'FontName=Arial,FontSize=18,PrimaryColour=&H00FFFFFF,BackColour=&H99000000,BorderStyle=3,Outline=0,Shadow=0,Alignment=2,MarginV=54'
$filter = "subtitles=filename='$escapedCaptions':force_style='$style'"
$before = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $clean)
& $ffmpeg -hide_banner -loglevel error -y -i $clean -map 0:v:0 -map 0:a:0 -map_metadata 0 -map_chapters 0 `
  -vf $filter -c:v libx264 -preset medium -crf 18 -r 30 -pix_fmt yuv420p `
  -c:a copy -movflags +faststart $captioned
if ($LASTEXITCODE -ne 0) { throw 'Unable to burn V5 English captions' }
$after = [double](& $ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $captioned)
if ([Math]::Abs($after - $before) -gt 0.15) { throw "Captioned duration changed from $before to $after" }
Move-Item -LiteralPath $captioned -Destination $Video -Force

$hash = (Get-FileHash -Algorithm SHA256 $Video).Hash.ToLowerInvariant()
if (Test-Path $Manifest) {
  $data = Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json
  $data.sha256 = $hash
  $data.durationSeconds = [Math]::Round($after, 3)
  $data | Add-Member -NotePropertyName captionsBurnedIn -NotePropertyValue $true -Force
  $data | Add-Member -NotePropertyName cleanVideo -NotePropertyValue $clean -Force
  $data | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $Manifest
}

[pscustomobject]@{
  video = $Video
  cleanVideo = $clean
  captions = $Captions
  durationSeconds = [Math]::Round($after, 3)
  sha256 = $hash
} | ConvertTo-Json
