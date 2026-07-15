param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$RunName = 'france-spain-2026-07-15',
  [int]$MinimumVideoSeconds = 7200
)

& (Join-Path $PSScriptRoot 'finalize-live-match-capture.ps1') -ProjectRoot $ProjectRoot -RunName $RunName -MinimumVideoSeconds $MinimumVideoSeconds
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
