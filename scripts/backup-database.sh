#!/bin/bash

# BOrganizer Complete Backup Script
# Erstellt ein Backup der SQLite-Datenbank und Bilder mit intelligenter 2-Wochen-Rotation

set -e

# Konfiguration
BACKUP_DIR="/home/andreas/beziehungs-organizer/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
WEEK_NUMBER=$(date +"%U")
YEAR=$(date +"%Y")
BACKUP_NAME="borganizer_week${WEEK_NUMBER}_${YEAR}"
GDRIVE_FOLDER="Backup - BBeziehungsorganizer"

# Log-Funktion
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_DIR}/backup.log"
}

# Backup-Verzeichnis erstellen
mkdir -p "$BACKUP_DIR"

log "🚀 Starte Complete Backup für Woche ${WEEK_NUMBER}..."

# 1. Container prüfen
CONTAINER_ID=$(docker ps -q -f "name=borganizer-pi")
if [ -z "$CONTAINER_ID" ]; then
    log "❌ FEHLER: borganizer-pi Container nicht gefunden!"
    exit 1
fi

log "📦 Container gefunden: $CONTAINER_ID"

# 2. Prüfe ob Backup für diese Woche bereits existiert
if rclone ls "gdrive:${GDRIVE_FOLDER}/${BACKUP_NAME}.tar.gz" > /dev/null 2>&1; then
    log "📁 Backup für Woche ${WEEK_NUMBER} existiert bereits - wird überschrieben"
else
    log "📁 Erstelle neues Backup für Woche ${WEEK_NUMBER}"
fi

# 3. Temporäres Backup-Verzeichnis erstellen
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

# 4. Datenbank kopieren
log "💾 Kopiere SQLite Datenbank..."
docker cp "$CONTAINER_ID:/app/backend/data/relationship_organizer.db" "$TEMP_DIR/database.db"

# 5. Bilder kopieren (falls vorhanden)
log "🖼️ Kopiere Bilder..."
if docker exec "$CONTAINER_ID" ls /app/backend/uploads/ > /dev/null 2>&1; then
    docker cp "$CONTAINER_ID:/app/backend/uploads" "$TEMP_DIR/"
else
    log "⚠️ Keine Bilder gefunden"
    mkdir -p "$TEMP_DIR/uploads"
fi

# 6. Komprimieren
log "🗜️ Komprimiere Backup..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" -C "$TEMP_DIR" .

# 7. Upload zu Google Drive (überschreibt existierendes Backup)
log "☁️ Upload zu Google Drive..."
if rclone copy "${BACKUP_NAME}.tar.gz" "gdrive:${GDRIVE_FOLDER}/" --progress --timeout=600s; then
    log "✅ Backup erfolgreich hochgeladen!"
else
    log "❌ FEHLER: Upload fehlgeschlagen!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 8. Alte Wochen-Backups löschen (älter als 2 Wochen)
log "🗑️ Räume alte Backups auf..."
CUTOFF_WEEK=$(($(date +"%U") - 2))
if [ "$CUTOFF_WEEK" -lt 0 ]; then
    CUTOFF_WEEK=$((52 + CUTOFF_WEEK))
fi

# Lösche Backups älter als 2 Wochen
rclone ls "gdrive:${GDRIVE_FOLDER}/" | grep "borganizer_week" | while read -r size filename; do
    if [[ "$filename" =~ borganizer_week([0-9]+)_([0-9]+)\.tar\.gz ]]; then
        week_num="${BASH_REMATCH[1]}"
        year_num="${BASH_REMATCH[2]}"
        
        # Lösche wenn älter als 2 Wochen oder altes Jahr
        if [ "$year_num" -lt "$YEAR" ] || [ "$week_num" -lt "$CUTOFF_WEEK" ]; then
            log "🗑️ Lösche altes Backup: $filename"
            rclone delete "gdrive:${GDRIVE_FOLDER}/$filename"
        fi
    fi
done

# 9. Lokale Aufräumung
log "🧹 Räume lokale Dateien auf..."
rm -rf "$TEMP_DIR"
find "$BACKUP_DIR" -name "borganizer_week*.tar.gz" -mtime +7 -delete

# 10. Backup-Info
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
log "📊 Backup erstellt: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"
log "🎉 Complete Backup erfolgreich abgeschlossen!"

# 11. Status-Log
echo "COMPLETE_SUCCESS:$(date):${BACKUP_NAME}.tar.gz:${BACKUP_SIZE}" >> "${BACKUP_DIR}/backup_status.log"