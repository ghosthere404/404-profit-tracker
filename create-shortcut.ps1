# Create Desktop Shortcut for Solana Wallet Tracker
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\Wallet Tracker.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\launch-tracker.bat"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "Solana Wallet Tracker - Monitor your memecoin launches"
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully!" -ForegroundColor Green
Write-Host "You can now double-click 'Wallet Tracker' on your desktop to launch the app." -ForegroundColor Yellow
Read-Host "Press Enter to close"