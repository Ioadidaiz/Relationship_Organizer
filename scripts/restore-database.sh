#!/bin/bash

# BOrganizer Database Restore Script
# Stellt ein Backup aus Google Drive wieder her

set -e

# Konfiguration
BACKUP_DIR="/home/andreas/beziehungs-organizer/backups"
PROJECT_DIR="/home/andreas/beziehungs-organizer"
GDRIVE_FOLDER="Backup - BBeziehungsorganizer"

# Funktionen
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

show_usage() {
    echo "Usage: $0 [backup_filename]"
    echo ""
    echo "Ohne Parameter: Zeigt verfügbare Backups an"
    echo "Mit Parameter: Stellt das angegebene Backup wieder her"
    echo ""
    echo "Beispiel: $0 borganizer_backup_20251003_120000.tar.gz"
}

list_backups() {
    log "📋 Verfügbare Backups in Google Drive:"
    rclone ls "gdrive:${GDRIVE_FOLDER}/" --include "borganizer_backup_*.tar.gz" | sort -r | head -10
    echo ""
    log "💡 Verwendung: $0 <backup_filename>"
}

# Parameter prüfen
if [ $# -eq 0 ]; then
    list_backups
    exit 0
fi

BACKUP_FILE="$1"

if [ "$BACKUP_FILE" = "--help" ] || [ "$BACKUP_FILE" = "-h" ]; then
    show_usage
    exit 0
fi

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

log "🔄 Starte Restore von: $BACKUP_FILE"

# 1. Prüfen ob Backup existiert
if ! rclone ls "gdrive:${GDRIVE_FOLDER}/$BACKUP_FILE" > /dev/null 2>&1; then
    log "❌ FEHLER: Backup $BACKUP_FILE nicht in Google Drive gefunden!"
    log "💡 Verfügbare Backups:"
    list_backups
    exit 1
fi

# 2. Sicherheitsabfrage
echo "⚠️  WARNUNG: Dieser Vorgang überschreibt die aktuelle Datenbank!"
echo "📁 Wiederherzustellendes Backup: $BACKUP_FILE"
echo ""
read -p "Möchten Sie fortfahren? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "❌ Restore abgebrochen."
    exit 1
fi

# 3. Container stoppen
log "⏹️ Stoppe Container..."
cd "$PROJECT_DIR"
docker compose -f docker-compose.pi.yml --env-file .env.pi down

# 4. Backup herunterladen
log "⬇️ Lade Backup von Google Drive herunter..."
rclone copy "gdrive:${GDRIVE_FOLDER}/$BACKUP_FILE" "$BACKUP_DIR/"

# 5. Backup entpacken
log "📦 Entpacke Backup..."
cd "$BACKUP_DIR"
BACKUP_NAME="${BACKUP_FILE%.tar.gz}"
tar -xzf "$BACKUP_FILE"

# 6. Docker Volumes finden und sichern
log "💾 Sichere aktuelle Daten..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker volume create "borganizer_pi_data_backup_${TIMESTAMP}" || true
docker volume create "borganizer_pi_uploads_backup_${TIMESTAMP}" || true

# 7. Datenbank wiederherstellen
log "🔄 Stelle Datenbank wieder her..."
# Temporären Container starten um Daten zu kopieren
docker run --rm -v borganizer_pi_data:/data -v "$BACKUP_DIR/$BACKUP_NAME:/backup" alpine:latest cp /backup/database.db /data/relationship_organizer.db

# 8. Uploads wiederherstellen (falls vorhanden)
if [ -d "$BACKUP_DIR/$BACKUP_NAME/uploads" ]; then
    log "🖼️ Stelle Uploads wieder her..."
    docker run --rm -v borganizer_pi_uploads:/uploads -v "$BACKUP_DIR/$BACKUP_NAME:/backup" alpine:latest sh -c "rm -rf /uploads/* && cp -r /backup/uploads/* /uploads/ 2>/dev/null || true"
fi

# 9. Logs wiederherstellen (falls vorhanden)
if [ -d "$BACKUP_DIR/$BACKUP_NAME/logs" ]; then
    log "📝 Stelle Logs wieder her..."
    docker run --rm -v borganizer_pi_logs:/logs -v "$BACKUP_DIR/$BACKUP_NAME:/backup" alpine:latest sh -c "cp -r /backup/logs/* /logs/ 2>/dev/null || true"
fi

# 10. Container neu starten
log "🚀 Starte Container neu..."
cd "$PROJECT_DIR"
docker compose -f docker-compose.pi.yml --env-file .env.pi up -d

# 11. Warten bis Container ready
log "⏳ Warte auf Container-Start..."
sleep 10

# 12. Health Check
CONTAINER_ID=$(docker ps -q -f "name=borganizer-pi")
if [ -n "$CONTAINER_ID" ]; then
    if docker exec "$CONTAINER_ID" curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
        log "✅ Container läuft und ist gesund!"
    else
        log "⚠️ Container läuft, aber Health Check fehlgeschlagen"
    fi
else
    log "❌ FEHLER: Container konnte nicht gestartet werden!"
    exit 1
fi

# 13. Aufräumen
log "🧹 Räume temporäre Dateien auf..."
rm -rf "$BACKUP_DIR/$BACKUP_NAME"

log "🎉 Restore erfolgreich abgeschlossen!"
log "📊 Wiederhergestellt: $BACKUP_FILE"
log "🌐 App verfügbar unter: http://192.168.178.45/"