#!/bin/bash

# Quick Backup Script
# Für schnelle manuelle Backups vor kritischen Änderungen

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/manual_backup_$TIMESTAMP"

echo "💾 Erstelle manuelles Backup..."

mkdir -p "$BACKUP_DIR"

# Datenbank sichern
if [ -f "./data/db/relationship_organizer.db" ]; then
    cp "./data/db/relationship_organizer.db" "$BACKUP_DIR/relationship_organizer.db"
    DB_SIZE=$(stat -c%s "./data/db/relationship_organizer.db")
    echo "✅ Datenbank gesichert (${DB_SIZE} bytes)"
else
    echo "❌ Datenbank nicht gefunden!"
    exit 1
fi

# Uploads sichern
if [ -d "./data/uploads" ] && [ "$(ls -A ./data/uploads)" ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "./data" uploads/
    echo "✅ Uploads gesichert"
fi

# System-Info speichern
echo "Backup erstellt am: $(date)" > "$BACKUP_DIR/info.txt"
echo "Git Commit: $(git rev-parse HEAD)" >> "$BACKUP_DIR/info.txt"
echo "Git Branch: $(git branch --show-current)" >> "$BACKUP_DIR/info.txt"

echo ""
echo "🎉 Manuelles Backup erstellt!"
echo "📁 Ordner: $BACKUP_DIR"
echo "🔄 Rollback: ./rollback.sh $TIMESTAMP"