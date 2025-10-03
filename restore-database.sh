#!/bin/bash

# Beziehungsorganizer Database Restore Script
# Stellt Backups von Google Drive wieder her
# Autor: Pi Development Setup

set -e

# Konfiguration
GDRIVE_REMOTE="gdrive:BOrganizer-Backups"
RESTORE_DIR="/tmp/borganizer-restore"
CONTAINER_NAME="borganizer-pi"
LOG_FILE="/var/log/borganizer-restore.log"

# Logging-Funktion
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Hilfe anzeigen
show_help() {
    echo "BOrganizer Database Restore Script"
    echo ""
    echo "Usage: $0 [OPTION] [BACKUP_FILE]"
    echo ""
    echo "Options:"
    echo "  -l, --list          Liste verfügbare Backups"
    echo "  -r, --restore FILE  Stelle spezifisches Backup wieder her"
    echo "  -h, --help          Zeige diese Hilfe"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --restore borganizer_backup_20251002_140000.tar.gz"
}

# Verfügbare Backups auflisten
list_backups() {
    log "📋 Listing available backups from Google Drive..."
    echo ""
    echo "Verfügbare Backups:"
    echo "==================="
    rclone ls "$GDRIVE_REMOTE" | sort -r | head -20
    echo ""
    echo "Für Restore verwenden Sie: $0 --restore FILENAME"
}

# Backup wiederherstellen
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        echo "❌ Backup-Dateiname erforderlich!"
        show_help
        exit 1
    fi
    
    log "🔄 Starting restore of backup: $backup_file"
    
    # Warnung anzeigen
    echo ""
    echo "⚠️  WARNUNG: Dieser Vorgang überschreibt die aktuelle Datenbank!"
    echo "   Alle aktuellen Daten gehen verloren."
    echo ""
    read -p "Sind Sie sicher? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "❌ Restore abgebrochen"
        exit 1
    fi
    
    # Restore-Verzeichnis erstellen
    mkdir -p "$RESTORE_DIR"
    cd "$RESTORE_DIR"
    
    # Backup von Google Drive herunterladen
    log "⬇️ Downloading backup from Google Drive..."
    if rclone copy "$GDRIVE_REMOTE/$backup_file" . --progress; then
        log "✅ Backup downloaded successfully"
    else
        log "❌ Failed to download backup"
        exit 1
    fi
    
    # Backup entpacken
    log "📦 Extracting backup..."
    tar -xzf "$backup_file"
    
    # Container stoppen
    log "⏹️ Stopping Docker container..."
    docker compose -f /home/andreas/beziehungs-organizer/docker-compose.pi.yml --env-file /home/andreas/beziehungs-organizer/.env.pi stop
    
    # Datenbank wiederherstellen
    if [ -f "relationship_organizer.db" ]; then
        log "🗄️ Restoring database..."
        docker cp "relationship_organizer.db" "${CONTAINER_NAME}:/app/backend/data/relationship_organizer.db"
        log "✅ Database restored"
    else
        log "❌ Database file not found in backup"
        exit 1
    fi
    
    # Uploads wiederherstellen (falls vorhanden)
    if [ -d "uploads" ]; then
        log "📁 Restoring uploads folder..."
        docker cp "uploads/." "${CONTAINER_NAME}:/app/backend/uploads/"
        log "✅ Uploads restored"
    fi
    
    # Container neu starten
    log "🚀 Starting Docker container..."
    docker compose -f /home/andreas/beziehungs-organizer/docker-compose.pi.yml --env-file /home/andreas/beziehungs-organizer/.env.pi start
    
    # Aufräumen
    log "🧹 Cleaning up..."
    rm -rf "$RESTORE_DIR"
    
    # Telegram-Benachrichtigung
    if command -v curl &> /dev/null && [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        log "📱 Sending Telegram notification..."
        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d chat_id="$TELEGRAM_CHAT_ID" \
            -d text="🔄 *BOrganizer Restore erfolgreich*%0A%0A📅 Datum: $(date +'%d.%m.%Y %H:%M')%0A📁 Backup: $backup_file" \
            -d parse_mode="Markdown" > /dev/null
    fi
    
    log "🎉 Restore completed successfully!"
    log "🌐 You can now access BOrganizer at: http://192.168.178.45/"
}

# Parameter verarbeiten
case "$1" in
    -l|--list)
        list_backups
        ;;
    -r|--restore)
        restore_backup "$2"
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo "❌ Ungültiger Parameter: $1"
        show_help
        exit 1
        ;;
esac