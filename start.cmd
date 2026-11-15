@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE="
if exist "%~dp0runtime\node.exe" set "NODE_EXE=%~dp0runtime\node.exe"
if defined NODE_EXE goto node_found
for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
if defined NODE_EXE goto node_found
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE_EXE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if defined NODE_EXE goto node_found
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if defined NODE_EXE goto node_found
echo Node.js 24 or newer was not found.
echo Install it from https://nodejs.org/ and run this file again.
if /i not "%~1"=="--check" pause
exit /b 1
:node_found
"%NODE_EXE%" -e "if(Number(process.versions.node.split('.')[0]) < 24) { console.error('Node.js 24 or newer is required.'); process.exit(1); }"
if errorlevel 1 goto failed
if /i "%~1"=="--check" goto check_only
if not exist "%~dp0scripts\start-local.mjs" goto missing_project
"%NODE_EXE%" "%~dp0scripts\start-local.mjs" %*
if errorlevel 1 goto failed
exit /b 0
:check_only
echo Node executable: %NODE_EXE%
"%NODE_EXE%" --version
"%NODE_EXE%" --check "%~dp0server.mjs"
if errorlevel 1 exit /b 1
"%NODE_EXE%" -e "const {DatabaseSync}=require('node:sqlite'); const d=new DatabaseSync(':memory:'); d.exec('CREATE TABLE t(id INTEGER)'); d.close(); console.log('Launcher and SQLite check passed.');"
exit /b %ERRORLEVEL%
:missing_project
echo Extract the complete ZIP into one folder before starting.
if /i not "%~1"=="--check" pause
exit /b 1
:failed
echo Startup failed. Read the error above.
if /i not "%~1"=="--check" pause
exit /b 1
