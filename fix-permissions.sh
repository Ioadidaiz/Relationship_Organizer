#!/bin/bash

# Fix Data Permissions Script
# Wird automatisch ausgeführt um sicherzustellen dass Container Schreibrechte hat

echo "🔧 Prüfe und setze Daten-Berechtigungen..."

# Setze Owner auf Container-User (1001:1001)
sudo chown -R 1001:1001 ./data/ 2>/dev/null || {
    echo "⚠️ Benötige sudo-Rechte für Berechtigungen"
    echo "Führe aus: sudo chown -R 1001:1001 ./data/"
    exit 1
}

# Setze Schreibrechte
sudo chmod -R 775 ./data/db ./data/uploads ./data/logs 2>/dev/null

# Verifiziere Berechtigungen
if [ -f "./data/db/relationship_organizer.db" ]; then
    DB_PERMS=$(stat -c "%a" ./data/db/relationship_organizer.db)
    echo "✅ Datenbank-Berechtigungen: $DB_PERMS"
else
    echo "⚠️ Datenbank noch nicht vorhanden"
fi

echo "✅ Berechtigungen gesetzt!"