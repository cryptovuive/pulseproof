param(
  [Parameter(Mandatory = $true)][string]$Output,
  [int]$DurationSeconds = 30,
  [int]$FrameRate = 30
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

$ffmpeg = 'C:\ffmpeg\bin\ffmpeg.exe'
if (-not (Test-Path $ffmpeg)) { throw "Missing FFmpeg: $ffmpeg" }

$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
if ($screen.Width -ne 1920 -or $screen.Height -ne 1080) {
  throw "Primary display must be 1920x1080; found $($screen.Width)x$($screen.Height)"
}

$resolvedOutput = [System.IO.Path]::GetFullPath($Output)
$outputDirectory = Split-Path -Parent $resolvedOutput
New-Item -ItemType Directory -Force $outputDirectory | Out-Null
if (Test-Path $resolvedOutput) {
  throw "Refusing to overwrite an existing take: $resolvedOutput"
}

$log = "$resolvedOutput.ffmpeg.log"
$arguments = @(
  '-hide_banner', '-loglevel', 'warning', '-y',
  '-f', 'gdigrab', '-draw_mouse', '0', '-framerate', [string]$FrameRate, '-i', 'desktop',
  '-t', [string]$DurationSeconds, '-an',
  '-fps_mode', 'cfr', '-r', [string]$FrameRate,
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart', $resolvedOutput
)

$process = Start-Process -FilePath $ffmpeg -ArgumentList $arguments `
  -RedirectStandardError $log -WindowStyle Hidden -PassThru

[pscustomobject]@{
  pid = $process.Id
  output = $resolvedOutput
  log = $log
  durationSeconds = $DurationSeconds
  frameRate = $FrameRate
  cursorMode = 'browser-control-only'
  startedAt = (Get-Date).ToUniversalTime().ToString('o')
} | ConvertTo-Json
