@echo off
title Asset Tracker Server
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
