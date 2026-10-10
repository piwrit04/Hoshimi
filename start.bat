@echo off
REM ============================================================
REM  Hoshimi ( Xingjian ) - desktop launcher
REM
REM  English-only on purpose: Chinese text inside a .bat needs the
REM  right code page and still breaks on some systems, so this file
REM  stays pure ASCII.
REM
REM  What it does
REM    1. cd to this script's own folder
REM    2. check Node.js
REM    3. npm install if the renderer / Electron dependencies are missing
REM    4. build the renderer, then open the Electron window
REM
REM  IMPORTANT
REM    The Electron window cannot be started from inside the DSH agent
REM    session - it dies immediately with exit code 0x80000003. Run this
REM    file by double-clicking it, or from your own terminal.
REM
REM    If the window never appears, read the boot log at
REM    %APPDATA%\Hoshimi\boot.log - the main process logs from its very
REM    first line, including renderer crashes.
REM ============================================================
setlocal
title Hoshimi Launcher
cd /d "%~dp0"

echo ===================================================
echo                  Hoshimi Launcher
echo ===================================================
echo.

REM ---- 1. Node.js present? ----
where node >nul 2>nul
if %errorlevel% equ 0 goto NODE_OK
echo [ERROR] Node.js was not found in PATH.
echo         Install Node.js 20 or 22 from https://nodejs.org/
echo.
pause
exit /b 1
:NODE_OK

REM ---- 2. renderer dependencies ----
if exist "node_modules\" goto RENDERER_OK
echo [INFO] Renderer dependencies are missing. Running npm install...
echo.
call npm install
if %errorlevel% equ 0 goto RENDERER_OK
echo.
echo [ERROR] npm install failed. Check your network and try again.
pause
exit /b 1
:RENDERER_OK

REM ---- 3. Electron runtime ----
REM Use the China mirror, otherwise the ~200 MB download stalls.
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/

if exist "electron\node_modules\electron\dist\electron.exe" goto ELECTRON_OK
echo [INFO] Electron runtime is missing. Installing, about 200 MB - please wait...
echo.
call npm run electron:install
if %errorlevel% equ 0 goto ELECTRON_OK
echo.
echo [ERROR] Electron install failed. Check your network and try again.
pause
exit /b 1
:ELECTRON_OK

REM ---- 4. build + launch ----
echo [STARTING] Building the renderer, then opening the Hoshimi window...
echo            The first build takes a few seconds.
echo.

REM Required due to CodexSandboxUsers restrictions on this system
set ELECTRON_NO_SANDBOX=1

call npm run shell
set EXITCODE=%errorlevel%
echo.
if "%EXITCODE%"=="0" goto CLOSED_OK

echo [ERROR] Electron exited with code %EXITCODE%.
echo.
REM --- The boot log is the single most useful diagnostic. main.cjs writes to it
REM     from its very first line, so its existence tells us WHERE Electron died.
if exist "%APPDATA%\Hoshimi\boot.log" goto DIAG_STARTED

echo [DIAGNOSIS] boot.log is MISSING.
echo             Electron died BEFORE running main.cjs, i.e. during Chromium
echo             startup - not a bug in this app.
echo             On this machine that happens for every Electron app we tried
echo             (including one that already shipped installers), and plain GUI
echo             apps like Notepad still work.
echo.
echo             Worth trying: disable Chromium's own sandbox and run again.
echo                 edit scripts\electron-run.mjs and add "--no-sandbox"
echo                 to the spawn() argument list
echo             In our test that made Electron get further but it still did not
echo             finish starting, so treat it as a diagnostic, not a fix.
goto DONE

:DIAG_STARTED
echo [DIAGNOSIS] boot.log EXISTS - so Electron DID start and DID run main.cjs.
echo             The failure is inside the app or the renderer. Read the log:
echo                 %APPDATA%\Hoshimi\boot.log
goto DONE

:CLOSED_OK
echo [DONE] Hoshimi closed normally.

:DONE
echo.
pause
exit /b %EXITCODE%
