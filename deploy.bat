@echo off
REM Vereinfachter Deploy-Befehl für Beziehungs-Organizer

if "%1"=="" (
    echo Verwendung: deploy.bat "Commit-Message"
    echo Beispiel:   deploy.bat "Fix UI scrolling issue"
    exit /b 1
)

powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -CommitMessage "%~1"
pause