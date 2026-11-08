"""在 Windows 任务计划程序里注册/删除定时任务：每隔 schedule_hours 小时用 pythonw 跑一次 cron。"""
import sys
from pathlib import Path

from .common import CONFIG, ROOT, sh

NAME = "AutoGitter"


def _ps(script):
    script = "[Console]::OutputEncoding = [Text.Encoding]::UTF8\n" + script
    return sh("powershell", "-NoProfile", "-NonInteractive", "-Command", script)


def install():
    pythonw = Path(sys.executable).with_name("pythonw.exe")
    hours = CONFIG["schedule_hours"]
    # 上一轮还没跑完时跳过这一轮（IgnoreNew）；单轮最长 8 小时；只在用户登录时运行，这样能用 gh 的 keyring 登录态
    _ps(f"""
$action = New-ScheduledTaskAction -Execute '{pythonw}' -Argument '-m autogitter cron' -WorkingDirectory '{ROOT}'
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Hours {hours})
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 8) `
    -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName '{NAME}' -Action $action -Trigger $trigger -Settings $settings `
    -Description 'AutoGitter: find, fix, review and submit bug fixes ({ROOT})' -Force | Out-Null
""")
    print(f"已注册任务 {NAME}：1 分钟后首次运行，之后每 {hours} 小时一次；日志在 data/logs/cron-<日期>.log")
    status()


def uninstall():
    _ps(f"Unregister-ScheduledTask -TaskName '{NAME}' -Confirm:$false")
    print(f"已删除任务 {NAME}")


def status():
    print(_ps(f"""
$t = Get-ScheduledTask -TaskName '{NAME}' -ErrorAction SilentlyContinue
if (-not $t) {{ '未注册' }} else {{
  $i = $t | Get-ScheduledTaskInfo
  "状态：$($t.State)  上次运行：$($i.LastRunTime)  结果：$($i.LastTaskResult)  下次运行：$($i.NextRunTime)"
}}""").strip())


def pause():
    _ps(f"Disable-ScheduledTask -TaskName '{NAME}' | Out-Null")
    print("已暂停：不再按时启动新的一轮（正在跑的一轮不受影响，要中断用 stop）")


def resume():
    _ps(f"Enable-ScheduledTask -TaskName '{NAME}' | Out-Null")
    print("已恢复定时运行")
    status()


def start():
    _ps(f"Start-ScheduledTask -TaskName '{NAME}'")
    print("已立即启动一轮（若上一轮还在跑则忽略）")


def stop():
    """中断正在跑的一轮，连同它启动的 claude 等子进程。被中断的任务在下一轮开始时标为 failed。"""
    _ps(f"""
Get-CimInstance Win32_Process -Filter "Name='pythonw.exe'" |
  Where-Object {{ $_.CommandLine -match 'autogitter cron' }} |
  ForEach-Object {{ taskkill /T /F /PID $_.ProcessId | Out-Null }}
Stop-ScheduledTask -TaskName '{NAME}' -ErrorAction SilentlyContinue""")
    print("已中断正在运行的一轮")
