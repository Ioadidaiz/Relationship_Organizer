@echo off
echo 🚀 BOrganizer Docker Production Deployment
echo ==========================================

:: Erstelle notwendige Verzeichnisse
echo 📁 Erstelle Datenverzeichnisse...
if not exist "data" mkdir data
if not exist "data\db" mkdir data\db
if not exist "data\uploads" mkdir data\uploads
if not exist "data\logs" mkdir data\logs
if not exist "data\backups" mkdir data\backups

:: Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker ist nicht installiert!
    echo 📥 Installiere Docker Desktop von: https://docs.docker.com/desktop/windows/
    pause
    exit /b 1
)

:: Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose ist nicht installiert!
    echo 📥 Docker Compose ist normalerweise in Docker Desktop enthalten
    pause
    exit /b 1
)

echo ✅ Docker und Docker Compose gefunden

:: Zeige System Info
echo 📊 System Information:
docker --version
docker-compose --version

:: Build and start the application
echo.
echo 🔨 Baue Docker Images...
docker-compose down
docker-compose build --no-cache

if %errorlevel% neq 0 (
    echo ❌ Docker Build fehlgeschlagen!
    pause
    exit /b 1
)

echo 🏃 Starte BOrganizer in Production Mode...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Docker Start fehlgeschlagen!
    pause
    exit /b 1
)

:: Warte kurz für Container Start
echo ⏳ Warte auf Container Start...
timeout /t 15 /nobreak >nul

:: Health Check
echo 🩺 Führe Health Check durch...
curl -f http://localhost/api/health 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Health Check fehlgeschlagen - prüfe Container Status
)

echo.
echo 📊 Container Status:
docker-compose ps

echo.
echo 🎉 BOrganizer läuft jetzt in Production!
echo.
echo 🌐 URLs:
echo   Frontend: http://localhost
echo   API Health: http://localhost/api/health  
echo   Direct Backend: http://localhost:5000
echo.
echo 📋 Nützliche Befehle:
echo   Status prüfen: docker-compose ps
echo   Logs anzeigen: docker-compose logs -f
echo   Stoppen: docker-compose down
echo   Neustarten: docker-compose restart
echo   Updates: git pull ^&^& docker-compose up -d --build
echo.
echo 💡 Tipp: Erstelle regelmäßige Backups mit:
echo   docker-compose exec borganizer cp /app/backend/relationship_organizer.db /app/backend/backup_$(date +%%Y%%m%%d).db

pause