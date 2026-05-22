@echo off
cd /d "d:\Lavoro\Home Design Lab\Sito\Home Design Lab rev2"
taskkill /F /IM node.exe >nul 2>&1
ping 127.0.0.1 -n 3 >nul
node --env-file=.env server.mjs
pause