#!/bin/bash

# Universal Start Script für BOrganizer
# Startet Production Container mit automatischer Berechtigungskorrektur

echo "🚀 Starte BOrganizer..."

# 1. Berechtigungen automatisch korrigieren
echo "🔧 Setze Daten-Berechtigungen..."
./fix-permissions.sh || {
    echo "⚠️ Berechtigungen konnten nicht automatisch gesetzt werden"
    echo "Bitte manuell ausführen: sudo ./fix-permissions.sh"
}

# 2. Container starten
echo "🐳 Starte Docker Container..."
docker compose up -d

# 3. Health Check
echo "🏥 Warte auf Service..."
sleep 5

if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
    echo "✅ BOrganizer erfolgreich gestartet!"
    echo "🌐 Verfügbar unter: http://localhost"
    echo "📊 API: http://localhost:5000"
else
    echo "⚠️ Service möglicherweise noch nicht bereit. Prüfe Logs:"
    echo "   docker compose logs -f"
fi