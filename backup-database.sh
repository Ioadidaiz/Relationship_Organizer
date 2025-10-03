#!/bin/bash

# Beziehungsorganizer Database Backup Script
# Erstellt automatische Backups der SQLite-Datenbank zu Google Drive
# Autor: Pi Development Setup
# Datum: $(date +'%Y-%m-%d')

set -e  # Exit bei Fehlern

# Konfiguration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="/tmp/borganizer-backup"
DATE=$(date +'%Y%m%d_%H%M%S')
CONTAINER_NAME="borganizer-pi"
DB_PATH="/app/backend/data/relationship_organizer.db"
GDRIVE_REMOTE="gdrive:BOrganizer-Backups"
BACKUP_FILENAME="borganizer_backup_${DATE}.tar.gz"
LOG_FILE="/var/log/borganizer-backup.log"

# Logging-Funktion
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 Starting BOrganizer Database Backup..."

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# 1. Datenbank aus Docker-Container kopieren
log "📦 Extracting database from Docker container..."
if docker cp "${CONTAINER_NAME}:${DB_PATH}" "./relationship_organizer.db"; then
    log "✅ Database extracted successfully"
else
    log "❌ Failed to extract database from container"
    exit 1
fi

# 2. Zusätzliche Dateien sichern
log "📁 Backing up additional files..."

# Uploads-Ordner
if docker cp "${CONTAINER_NAME}:/app/backend/uploads" "./uploads" 2>/dev/null; then
    log "✅ Uploads folder backed up"
else
    log "⚠️ No uploads folder found (this is normal for new installations)"
fi

# Logs-Ordner
if docker cp "${CONTAINER_NAME}:/app/backend/logs" "./logs" 2>/dev/null; then
    log "✅ Logs folder backed up"
else
    log "⚠️ No logs folder found"
fi

# 3. Docker-Compose und Konfigurationsdateien
log "⚙️ Backing up configuration files..."
cp "$SCRIPT_DIR/docker-compose.pi.yml" . 2>/dev/null || log "⚠️ docker-compose.pi.yml not found"
cp "$SCRIPT_DIR/.env.pi" . 2>/dev/null || log "⚠️ .env.pi not found"
cp "$SCRIPT_DIR/nginx.conf" . 2>/dev/null || log "⚠️ nginx.conf not found"

# 4. System-Info hinzufügen
log "💻 Adding system information..."
cat > system_info.txt << EOF
BOrganizer Backup Information
============================
Backup Date: $(date)
Hostname: $(hostname)
Pi Model: $(cat /proc/device-tree/model 2>/dev/null || echo "Unknown")
Docker Version: $(docker --version)
Container Status: $(docker ps --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}")
Disk Usage: $(df -h / | tail -1)
Memory Usage: $(free -h | grep Mem)
EOF

# 5. Backup komprimieren
log "🗜️ Compressing backup..."
tar -czf "$BACKUP_FILENAME" ./*
BACKUP_SIZE=$(du -h "$BACKUP_FILENAME" | cut -f1)
log "✅ Backup compressed: $BACKUP_SIZE"

# 6. Upload zu Google Drive
log "☁️ Uploading to Google Drive..."
if rclone copy "$BACKUP_FILENAME" "$GDRIVE_REMOTE" --progress; then
    log "✅ Backup uploaded to Google Drive successfully"
    
    # Optional: Alte Backups löschen (behalte nur die letzten 4 Wochen)
    log "🧹 Cleaning up old backups (keeping last 4 weeks)..."
    rclone delete "$GDRIVE_REMOTE" --min-age 28d || log "⚠️ Old backup cleanup failed (this is normal if no old files exist)"
    
else
    log "❌ Failed to upload backup to Google Drive"
    exit 1
fi

# 7. Aufräumen
log "🧹 Cleaning up temporary files..."
rm -rf "$BACKUP_DIR"

# 8. Telegram-Benachrichtigung (optional)
if command -v curl &> /dev/null && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    log "📱 Sending Telegram notification..."
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="🗄️ *BOrganizer Backup erfolgreich*%0A%0A📅 Datum: $(date +'%d.%m.%Y %H:%M')%0A💾 Größe: $BACKUP_SIZE%0A☁️ Gespeichert in Google Drive" \
        -d parse_mode="Markdown" > /dev/null
fi

log "🎉 Backup completed successfully! File: $BACKUP_FILENAME (Size: $BACKUP_SIZE)"
log "📍 Location: Google Drive/$GDRIVE_REMOTE/$BACKUP_FILENAME"