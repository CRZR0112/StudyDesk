@echo off
chcp 65001 >nul
title 知序 StudyDesk
cd /d "%~dp0"

set "NODE_EXE="
for %%N in (node.exe) do set "NODE_EXE=%%~$PATH:N"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE_EXE (
  echo 找不到 Node.js。请先安装 Node.js 22.5 或以上，或使用 DeepSeek Harness 自带的 Node。
  pause
  exit /b 1
)

if not defined STUDYDESK_PIN (
  echo.
  echo  可选：设置一个访问密码，手机打开时需要输入。
  echo  直接按回车则跳过（同一 Wi-Fi 下的设备都能直接打开）。
  set /p "STUDYDESK_PIN=访问密码："
)

echo.
echo  知序 StudyDesk 正在启动…
echo  启动后请保持这个窗口打开；关闭窗口就会停止服务。
echo.
"%NODE_EXE%" server\index.mjs
echo.
echo 服务已停止。
pause
