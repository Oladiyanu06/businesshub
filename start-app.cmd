@echo off
REM ============================================================================
REM  BUSINESSHUB - local development server
REM
REM  Double-click this file to start the app at http://localhost:3000.
REM  It runs in this window, independently of any editor or agent session.
REM  Keep the window open while the app is in use; press Ctrl+C to stop.
REM
REM  This is still a development server on this PC. For a business that needs
REM  the app during your working day, deploy it to an always-on host - see
REM  README.md section 4 (Production checklist).
REM ============================================================================

setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js was not found. Install Node.js 20 or newer, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies ^(first run only, this can take a minute^)...
  call npm install
  if errorlevel 1 goto :failed
)

echo.
echo   BUSINESSHUB is starting at http://localhost:3000
echo   Keep this window open while you use the app.
echo   Press Ctrl+C to stop.
echo.

call npm run dev
goto :finished

:failed
echo.
echo Startup failed. Review the messages above.
echo.
pause
exit /b 1

:finished
echo.
echo The server has stopped.
pause
