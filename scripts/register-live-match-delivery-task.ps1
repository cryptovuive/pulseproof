param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [string]$DestinationDirectory = 'C:\Users\ducth\Downloads\video',
  [datetime]$DeliveryAtLocal = [datetime]'2026-07-16T06:50:00',
  [string]$TaskName = 'PulseProof-Live-england-argentina-2026-07-16-Deliver'
)

$ErrorActionPreference = 'Stop'
if ($DeliveryAtLocal -le (Get-Date).AddSeconds(20)) { throw "Delivery time must be in the future: $DeliveryAtLocal" }
$publisher = Join-Path $ProjectRoot 'scripts\publish-live-match-capture.ps1'
$arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$publisher`" -ProjectRoot `"$ProjectRoot`" -DestinationDirectory `"$DestinationDirectory`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments -WorkingDirectory $ProjectRoot
$trigger = New-ScheduledTaskTrigger -Once -At $DeliveryAtLocal
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -WakeToRun -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 40) -RestartCount 6 -RestartInterval (New-TimeSpan -Minutes 5)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
New-Item -ItemType Directory -Force $DestinationDirectory | Out-Null
$info = Get-ScheduledTaskInfo -TaskName $TaskName
[pscustomobject]@{
  taskName = $TaskName; deliveryAtLocal = $DeliveryAtLocal.ToString('o'); destination = $DestinationDirectory
  nextRunTime = $info.NextRunTime.ToString('o'); wakeToRun = $true; startWhenAvailable = $true; retryCount = 6
} | ConvertTo-Json
