#!/bin/bash

echo "🚀 BOrganizer Docker Production Setup"
echo "====================================="

# Erstelle notwendige Verzeichnisse für persistente Daten
echo "📁 Erstelle Datenverzeichnisse..."
mkdir -p ./data/db
mkdir -p ./data/uploads  
mkdir -p ./data/logs
mkdir -p ./data/backups

# Setze richtige Berechtigungen
echo "🔐 Setze Berechtigungen..."
chmod 755 ./data/db
chmod 755 ./data/uploads
chmod 755 ./data/logs
chmod 755 ./data/backups

# Prüfe Docker Installation
echo "🔍 Prüfe Docker Installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert!"
    echo "📥 Installiere Docker von: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ist nicht installiert!"
    echo "📥 Installiere Docker Compose von: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker und Docker Compose gefunden"

# Zeige System-Info
echo "📊 System Information:"
echo "  Docker Version: $(docker --version)"
echo "  Docker Compose Version: $(docker-compose --version)"
echo "  Verfügbarer Speicher: $(df -h . | tail -1 | awk '{print $4}')"

# Erstelle Backup Script
echo "💾 Erstelle Backup Script..."
cat > ./backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "📦 Erstelle Backup..."
mkdir -p $BACKUP_DIR

# Datenbank Backup
cp ./data/db/relationship_organizer.db "$BACKUP_DIR/db_backup_$TIMESTAMP.db" 2>/dev/null || echo "⚠️ Keine Datenbank zum Backup gefunden"

# Uploads Backup
tar -czf "$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz" -C ./data uploads/ 2>/dev/null || echo "⚠️ Keine Uploads zum Backup gefunden"

# Lösche alte Backups (älter als 7 Tage)
find $BACKUP_DIR -name "*backup*" -mtime +7 -delete 2>/dev/null

echo "✅ Backup erstellt: $TIMESTAMP"
ls -la $BACKUP_DIR/
EOF

chmod +x ./backup.sh

# Erstelle Monitoring Script
echo "📊 Erstelle Monitoring Script..."
cat > ./monitor.sh << 'EOF'
#!/bin/bash

echo "🔍 BOrganizer System Status"
echo "=========================="

# Docker Status
echo "📦 Container Status:"
docker-compose ps

echo ""
echo "💾 Speicherverbrauch:"
docker stats --no-stream borganizer-app borganizer-nginx 2>/dev/null || echo "Container nicht gestartet"

echo ""
echo "🌐 Health Check:"
curl -s http://localhost/api/health | jq . 2>/dev/null || echo "Health Check fehlgeschlagen"

echo ""
echo "📊 Log Statistiken:"
echo "  Error Logs: $(docker-compose logs borganizer 2>/dev/null | grep -i error | wc -l)"
echo "  NGINX Access: $(wc -l < ./data/logs/access.log 2>/dev/null || echo "0") requests"
EOF

chmod +x ./monitor.sh

# Erstelle Update Script  
echo "🔄 Erstelle Update Script..."
cat > ./update.sh << 'EOF'
#!/bin/bash

echo "🔄 BOrganizer Update wird gestartet..."

# Backup vor Update
echo "💾 Erstelle Backup vor Update..."
./backup.sh

# Git Pull für neueste Changes
echo "📥 Lade neueste Änderungen..."
git pull origin master

# Rebuild und Restart
echo "🔨 Rebuild Container..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo "⏳ Warte auf Container Start..."
sleep 10

# Health Check
echo "🩺 Führe Health Check durch..."
curl -f http://localhost/api/health || echo "⚠️ Health Check fehlgeschlagen"

echo "✅ Update abgeschlossen!"
EOF

chmod +x ./update.sh

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "  1. Starten: docker-compose up -d"
echo "  2. Status prüfen: ./monitor.sh"
echo "  3. Backup erstellen: ./backup.sh"
echo "  4. Update durchführen: ./update.sh"
echo ""
echo "🌐 URLs nach dem Start:"
echo "  Frontend: http://localhost"
echo "  API: http://localhost/api/health"
echo "  Direct Backend: http://localhost:5000"