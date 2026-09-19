@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to read the guest list. Install Node.js, then try again.
  pause
  exit /b 1
)
node "%~dp0prepare.cjs" %*
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "%~dp0index.html"
