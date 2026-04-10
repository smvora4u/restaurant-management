#Requires -Version 5.1
<#
  Registers a scheduled task to run print-agent.exe at user logon.

  Usage (run in PowerShell):
    .\register-logon-task.ps1 -InstallDir "C:\RestaurantPrintAgent"

  InstallDir must contain print-agent.exe and config.json.
  To remove: Unregister-ScheduledTask -TaskName "RestaurantPrintAgent" -Confirm:$false
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $InstallDir
)

$InstallDir = $InstallDir.TrimEnd('\', '/')
$exePath = Join-Path $InstallDir "print-agent.exe"

if (-not (Test-Path -LiteralPath $exePath)) {
  Write-Error "Not found: $exePath"
  exit 1
}

$taskName = "RestaurantPrintAgent"
$action = New-ScheduledTaskAction -Execute $exePath -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
} catch {}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Limited | Out-Null

Write-Host "Scheduled task registered: $taskName"
Write-Host "  Runs at: user logon"
Write-Host "  Program: $exePath"
Write-Host "  Start in: $InstallDir"
