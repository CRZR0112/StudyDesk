@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在请求管理员权限，以便允许手机访问 TCP 4173…
echo 如果弹出 UAC，请点“是”。
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\open-lan-firewall.ps1" -Port 4173
echo.
pause
