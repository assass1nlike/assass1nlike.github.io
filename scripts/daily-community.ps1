# Daily refresh of the community data: PRs/issues and my repositories' README files.
# Installed as the scheduled task "assassinlike-community-sync"; see install-daily-community.ps1.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logDir = Join-Path $root 'scripts\.cache'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$log = Join-Path $logDir 'daily-community.log'

function Write-Log($text) {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $log -Value "[$stamp] $text" -Encoding utf8
}

Set-Location $root
try {
    $branch = (git rev-parse --abbrev-ref HEAD).Trim()
    if ($branch -ne 'main') {
        Write-Log "skipped: current branch is $branch, not main"
        exit 0
    }
    $staged = (git diff --cached --name-only).Trim()
    if ($staged) {
        Write-Log 'skipped: staging area already has changes'
        exit 0
    }
    $output = & python -B scripts\export-contributions.py 2>&1
    Write-Log ($output -join ' | ')
    if ($LASTEXITCODE -ne 0) { throw 'export-contributions.py failed' }
    $output = & python -B scripts\export-projects.py 2>&1
    Write-Log ($output -join ' | ')
    if ($LASTEXITCODE -ne 0) { throw 'export-projects.py failed' }
    git add -- scripts/export-contributions.py scripts/export-projects.py scripts/projects.json assets/community assets/projects
    $changed = (git diff --cached --name-only).Trim()
    if (-not $changed) {
        Write-Log 'no changes'
        exit 0
    }
    git commit -q -m 'Refresh community data'
    git push -q origin main
    Write-Log ('pushed: ' + ($changed -replace "`r?`n", ', '))
}
catch {
    Write-Log ('failed: ' + $_.Exception.Message)
    exit 1
}
