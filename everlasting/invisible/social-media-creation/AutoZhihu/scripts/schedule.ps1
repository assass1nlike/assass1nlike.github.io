# 注册 Windows 计划任务：每天 $At 和每次登录 Windows 时启动 python -m autozhihu daily，
# 由它在 config.toml 的 publish_window 内随机挑时刻发布 daily_count 篇。
# 登录时启动用于关机重启后恢复当天剩下的发布；当天已发完或已在运行时会直接退出。
#   注册：powershell -ExecutionPolicy Bypass -File scripts\schedule.ps1 [-At 08:30]
#   删除：powershell -ExecutionPolicy Bypass -File scripts\schedule.ps1 -Remove
param(
    [string]$At = "08:30",
    [string]$Python = "D:\anaconda\envs\autozhihu\pythonw.exe",
    [switch]$Remove
)

$name = "AutoZhihu"
if ($Remove) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "已删除计划任务 $name"
    return
}

$root = Split-Path $PSScriptRoot -Parent
$action = New-ScheduledTaskAction -Execute $Python -Argument "-m autozhihu daily" -WorkingDirectory $root
$user = "$env:USERDOMAIN\$env:USERNAME"
$triggers = @(
    (New-ScheduledTaskTrigger -Daily -At $At),
    (New-ScheduledTaskTrigger -AtLogOn -User $user)
)
# 错过启动时间（关机）则开机后补跑；可唤醒睡眠中的电脑；同一时间只跑一个实例
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 20)
# 浏览器要有界面，所以只在用户登录时运行
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $name -Action $action -Trigger $triggers -Settings $settings `
    -Principal $principal -Description "AutoZhihu 每日自动写作并发布知乎回答" -Force | Out-Null

$info = Get-ScheduledTaskInfo -TaskName $name
Write-Host "已注册计划任务 $name，下次运行：$($info.NextRunTime)"
