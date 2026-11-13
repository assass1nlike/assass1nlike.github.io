# Register the daily community-data refresh as a Windows scheduled task.
# Run: powershell -ExecutionPolicy Bypass -File scripts\install-daily-community.ps1
# Remove: Unregister-ScheduledTask -TaskName assassinlike-community-sync -Confirm:$false

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$script = Join-Path $root 'scripts\daily-community.ps1'
$taskName = 'assassinlike-community-sync'

if (-not (Test-Path $script)) { throw "missing $script" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$script`"" `
    -WorkingDirectory $root
# Daily at 10:17 local time; StartWhenAvailable covers a run missed while the machine slept.
$trigger = New-ScheduledTaskTrigger -Daily -At '10:17'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries `
    -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Description 'Refresh homepage community data daily (PRs and issues, repository READMEs)' -Force | Out-Null

$info = Get-ScheduledTask -TaskName $taskName
Write-Output "registered $taskName, state $($info.State)"
Write-Output "test now: Start-ScheduledTask -TaskName $taskName"
Write-Output "log: $(Join-Path $root 'scripts\.cache\daily-community.log')"
