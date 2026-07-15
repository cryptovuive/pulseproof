param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$PublicOrigin = 'https://pulseproof-production-06fa.up.railway.app',
  [int]$FixtureId,
  [string]$ExpectedHome,
  [string]$ExpectedAway,
  [string]$KickoffUtc,
  [string]$RunName,
  [int]$LeadMinutes = 15,
  [int]$CaptureWindowMinutes = 270,
  [int]$WatchdogIntervalMinutes = 1,
  [int]$PreflightMinutes = 75,
  [string]$TaskPrefix = 'PulseProof-Live'
)

$ErrorActionPreference = 'Stop'
if (-not $FixtureId -or -not $ExpectedHome -or -not $ExpectedAway -or -not $KickoffUtc -or -not $RunName) { throw 'Fixture, teams, KickoffUtc and RunName are required' }
$kickoff = [DateTimeOffset]::Parse($KickoffUtc)
$startLocal = $kickoff.ToLocalTime().AddMinutes(-$LeadMinutes).DateTime
$stopUtc = $kickoff.ToUniversalTime().AddMinutes($CaptureWindowMinutes)
if ($startLocal -le (Get-Date).AddSeconds(20)) { throw "Scheduled start must be in the future; received $($startLocal.ToString('o'))" }

$ensure = Join-Path $ProjectRoot 'scripts\ensure-live-match-capture.ps1'
$worker = Join-Path $ProjectRoot 'scripts\capture-live-match-worker.ps1'
$finalize = Join-Path $ProjectRoot 'scripts\finalize-live-match-capture.ps1'
$captureTask = "$TaskPrefix-$RunName-Capture"
$auditTask = "$TaskPrefix-$RunName-Audit"
$preflightTask = "$TaskPrefix-$RunName-Preflight"
$ensureArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$ensure`" -ProjectRoot `"$ProjectRoot`" -PublicOrigin `"$PublicOrigin`" -FixtureId $FixtureId -ExpectedHome `"$ExpectedHome`" -ExpectedAway `"$ExpectedAway`" -RunName `"$RunName`" -StopAtUtc `"$($stopUtc.ToString('o'))`""
$auditArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$finalize`" -ProjectRoot `"$ProjectRoot`" -RunName `"$RunName`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $ensureArgs -WorkingDirectory $ProjectRoot
$duration = $stopUtc.ToLocalTime().DateTime - $startLocal
$trigger = New-ScheduledTaskTrigger -Once -At $startLocal -RepetitionInterval (New-TimeSpan -Minutes $WatchdogIntervalMinutes) -RepetitionDuration $duration
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited
Register-ScheduledTask -TaskName $captureTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null

$auditAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $auditArgs -WorkingDirectory $ProjectRoot
$auditTrigger = New-ScheduledTaskTrigger -Once -At $stopUtc.ToLocalTime().AddMinutes(5).DateTime
$auditSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 20)
Register-ScheduledTask -TaskName $auditTask -Action $auditAction -Trigger $auditTrigger -Settings $auditSettings -Principal $principal -Force | Out-Null

$preflightLocal = $kickoff.ToLocalTime().AddMinutes(-$PreflightMinutes).DateTime
$preflightRegistered = $false
if ($preflightLocal -gt (Get-Date).AddSeconds(20)) {
  $preflightRunName = "$RunName-preflight"
  $preflightArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$worker`" -ProjectRoot `"$ProjectRoot`" -PublicOrigin `"$PublicOrigin`" -FixtureId $FixtureId -ExpectedHome `"$ExpectedHome`" -ExpectedAway `"$ExpectedAway`" -DurationSeconds 10 -RunName `"$preflightRunName`""
  $preflightAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $preflightArgs -WorkingDirectory $ProjectRoot
  $preflightTrigger = New-ScheduledTaskTrigger -Once -At $preflightLocal
  $preflightSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
  Register-ScheduledTask -TaskName $preflightTask -Action $preflightAction -Trigger $preflightTrigger -Settings $preflightSettings -Principal $principal -Force | Out-Null
  $preflightRegistered = $true
}

$scheduleDir = Join-Path $ProjectRoot 'submission-assets\live-match\schedules'
New-Item -ItemType Directory -Force $scheduleDir | Out-Null
@{
  fixtureId = $FixtureId; homeTeam = $ExpectedHome; awayTeam = $ExpectedAway; kickoffUtc = $kickoff.ToUniversalTime().ToString('o')
  scheduledStartLocal = $startLocal.ToString('o'); stopAtUtc = $stopUtc.ToString('o'); captureTask = $captureTask; auditTask = $auditTask
  preflightTask = if ($preflightRegistered) { $preflightTask } else { $null }; preflightLocal = if ($preflightRegistered) { $preflightLocal.ToString('o') } else { $null }
  registeredAt = (Get-Date).ToUniversalTime().ToString('o'); mechanism = "Windows Task Scheduler + $WatchdogIntervalMinutes-minute watchdog + headless Chrome"
} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $scheduleDir "$RunName.json")

$taskNames = @($captureTask, $auditTask)
if ($preflightRegistered) { $taskNames += $preflightTask }
Get-ScheduledTask -TaskName $taskNames | Get-ScheduledTaskInfo | Select-Object TaskName, LastRunTime, LastTaskResult, NextRunTime | ConvertTo-Json
