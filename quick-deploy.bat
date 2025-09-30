@echo off
REM Quick Deploy - Verwendet automatische Commit-Message
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -CommitMessage "Quick deploy: %date% %time%"
pause