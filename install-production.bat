@echo off
echo =================================
echo  BOrganizer Production Installer
echo =================================

echo [INFO] Installiere PM2 global...
npm install -g pm2
npm install -g pm2-windows-service

echo [INFO] Erstelle Production Build...
call npm run build

echo [INFO] Installiere Production Dependencies...
cd backend
call npm install --only=production
cd ..

echo [INFO] Erstelle PM2 Ecosystem...
echo module.exports = {
echo   apps: [{
echo     name: 'borganizer-backend',
echo     script: './backend/server.js',
echo     instances: 1,
echo     exec_mode: 'cluster',
echo     env: {
echo       NODE_ENV: 'production',
echo       PORT: 5000
echo     },
echo     error_file: './logs/err.log',
echo     out_file: './logs/out.log',
echo     log_file: './logs/combined.log',
echo     time: true,
echo     max_memory_restart: '500M'
echo   }]
echo }; > ecosystem.config.js

echo [INFO] Erstelle Logs Ordner...
mkdir logs 2>nul

echo [INFO] Starte PM2 Service...
pm2 start ecosystem.config.js
pm2 save
pm2-service-install -n "BOrganizer"

echo [SUCCESS] BOrganizer wurde als Windows Service installiert!
echo [INFO] Service Befehle:
echo   - Starten: pm2 start borganizer-backend
echo   - Stoppen: pm2 stop borganizer-backend  
echo   - Neustarten: pm2 restart borganizer-backend
echo   - Status: pm2 status
echo   - Logs: pm2 logs borganizer-backend

pause