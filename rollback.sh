#!/bin/bash

# Rollback Script für Notfälle
# Stellt Daten aus einem Backup wieder her

if [ -z "$1" ]; then
    echo "❌ Fehler: Timestamp erforderlich!"
    echo "Verwendung: ./rollback.sh <timestamp>"
    echo ""
    echo "Verfügbare Backups:"
    ls -la ./backups/safety_backup_* 2>/dev/null | tail -10 || echo "Keine Backups gefunden"
    exit 1
fi

TIMESTAMP="$1"
BACKUP_DIR="./backups/safety_backup_$TIMESTAMP"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup nicht gefunden: $BACKUP_DIR"
    exit 1
fi

echo "🔄 Starte Rollback zu Backup: $TIMESTAMP"
echo "⚠️  WARNUNG: Dies überschreibt aktuelle Daten!"
echo "Fortfahren? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "❌ Abgebrochen."
    exit 1
fi

# Container stoppen
echo "🛑 Stoppe Container..."
docker compose down

# Datenbank wiederherstellen
if [ -f "$BACKUP_DIR/relationship_organizer.db" ]; then
    cp "$BACKUP_DIR/relationship_organizer.db" "./data/db/relationship_organizer.db"
    echo "✅ Datenbank wiederhergestellt"
else
    echo "❌ Datenbank-Backup nicht gefunden!"
    exit 1
fi

# Uploads wiederherstellen falls vorhanden
if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
    rm -rf "./data/uploads"
    mkdir -p "./data"
    tar -xzf "$BACKUP_DIR/uploads.tar.gz" -C "./data"
    echo "✅ Uploads wiederhergestellt"
fi

# Logs wiederherstellen falls vorhanden
if [ -f "$BACKUP_DIR/logs.tar.gz" ]; then
    rm -rf "./data/logs"
    mkdir -p "./data"
    tar -xzf "$BACKUP_DIR/logs.tar.gz" -C "./data"
    echo "✅ Logs wiederhergestellt"
fi

# Container starten
echo "🚀 Starte Container..."
docker compose up -d

# Health Check
echo "🏥 Prüfe System..."
sleep 10
if curl -f http://localhost/api/health &>/dev/null; then
    echo "✅ Rollback erfolgreich!"
    
    # Daten-Verfügbarkeit testen
    EVENT_COUNT=$(curl -s http://localhost/api/events | jq '. | length' 2>/dev/null || echo "0")
    echo "📊 $EVENT_COUNT Events verfügbar"
else
    echo "❌ Health Check nach Rollback fehlgeschlagen!"
fi

echo "🎉 Rollback abgeschlossen!"