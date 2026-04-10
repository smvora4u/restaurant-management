#Requires -Version 5.1
<#
  Creates a shortcut to print-agent.exe in the current user's Startup folder.
  "Start in" (Working directory) is set to the folder containing the exe so config.json is found.

  Usage (run in PowerShell):
    .\install-startup-shortcut.ps1 -InstallDir "C:\RestaurantPrintAgent"

  InstallDir must contain print-agent.exe and config.json.
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

$shell = New-Object -ComObject WScript.Shell
$startup = [Environment]::GetFolderPath('Startup')
$lnkPath = Join-Path $startup "RestaurantPrintAgent.lnk"
$shortcut = $shell.CreateShortcut($lnkPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $InstallDir
$shortcut.WindowStyle = 1
$shortcut.Description = "Restaurant print agent (ESC/POS queue)"
$shortcut.Save()

Write-Host "Startup shortcut created:"
Write-Host "  $lnkPath"
Write-Host "Working directory: $InstallDir"
