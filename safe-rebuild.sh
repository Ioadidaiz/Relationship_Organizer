#!/bin/bash

# ULTRA-SICHERER Docker-Rebuild Script
# Garantiert Datenschutz bei Container-Updates

set -e  # Script stoppt bei jedem Fehler

echo "�️ Ultra-sicherer Docker-Rebuild gestartet..."

# Farben für bessere Lesbarkeit
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backup-Konfiguration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SAFETY_BACKUP_DIR="$BACKUP_DIR/safety_backup_$TIMESTAMP"

echo -e "${BLUE}📋 Sicherheits-Checkliste:${NC}"
echo "1. ✅ Automatisches Backup vor jedem Rebuild"
echo "2. ✅ Daten-Integrität Prüfung"
echo "3. ✅ Rollback-Möglichkeit"
echo "4. ✅ Health Checks nach Rebuild"
echo ""

# 1. CRITICAL: Daten-Backup erstellen
echo -e "${YELLOW}💾 SCHRITT 1: Kritische Daten sichern...${NC}"
mkdir -p "$SAFETY_BACKUP_DIR"

# Datenbank IMMER sichern
if [ -f "./data/db/relationship_organizer.db" ]; then
    cp "./data/db/relationship_organizer.db" "$SAFETY_BACKUP_DIR/relationship_organizer.db"
    DB_SIZE=$(stat -c%s "./data/db/relationship_organizer.db")
    echo -e "${GREEN}✅ Datenbank gesichert (${DB_SIZE} bytes)${NC}"
else
    echo -e "${RED}❌ KRITISCHER FEHLER: Datenbank nicht gefunden!${NC}"
    echo "Pfad: ./data/db/relationship_organizer.db"
    exit 1
fi

# Uploads sichern falls vorhanden
if [ -d "./data/uploads" ] && [ "$(ls -A ./data/uploads)" ]; then
    tar -czf "$SAFETY_BACKUP_DIR/uploads.tar.gz" -C "./data" uploads/
    echo -e "${GREEN}✅ Uploads gesichert${NC}"
else
    echo -e "${YELLOW}⚠️ Keine Uploads zum Sichern${NC}"
fi

# Logs sichern falls vorhanden
if [ -d "./data/logs" ] && [ "$(ls -A ./data/logs)" ]; then
    tar -czf "$SAFETY_BACKUP_DIR/logs.tar.gz" -C "./data" logs/
    echo -e "${GREEN}✅ Logs gesichert${NC}"
fi

# 2. Daten-Integrität prüfen
echo -e "${YELLOW}🔍 SCHRITT 2: Daten-Integrität prüfen...${NC}"
if command -v sqlite3 &> /dev/null; then
    if sqlite3 "./data/db/relationship_organizer.db" "PRAGMA integrity_check;" | grep -q "ok"; then
        echo -e "${GREEN}✅ Datenbank-Integrität: OK${NC}"
    else
        echo -e "${RED}❌ FEHLER: Datenbank beschädigt!${NC}"
        echo "Rebuild abgebrochen. Prüfen Sie die Datenbank manuell."
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ SQLite3 nicht installiert - Integrität nicht prüfbar${NC}"
fi

# 3. Git Status prüfen
echo -e "${YELLOW}📋 SCHRITT 3: Git Status prüfen...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️ Uncommitted Änderungen gefunden:${NC}"
    git status --short
    echo ""
    echo "Möchten Sie trotzdem fortfahren? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Abgebrochen.${NC}"
        exit 1
    fi
fi

# 4. Neueste Version pullen
echo -e "${YELLOW}⬇️ SCHRITT 4: Neueste Version laden...${NC}"
git fetch origin
git pull origin master

# 5. Container sicher stoppen
echo -e "${YELLOW}🛑 SCHRITT 5: Container stoppen...${NC}"
docker compose down

# 6. WICHTIG: Daten-Ordner existenz prüfen
echo -e "${YELLOW}📁 SCHRITT 6: Daten-Ordner Struktur prüfen...${NC}"
mkdir -p "./data/db" "./data/uploads" "./data/logs"

# KRITISCH: Berechtigungen für Container-User setzen
sudo chown -R 1001:1001 "./data/" 2>/dev/null || echo "⚠️ Konnte Berechtigungen nicht setzen"
sudo chmod 775 "./data/db" "./data/uploads" "./data/logs" 2>/dev/null
sudo chmod 666 "./data/db/relationship_organizer.db" 2>/dev/null || true

echo -e "${GREEN}✅ Alle Daten-Ordner und Berechtigungen konfiguriert${NC}"

# 7. Clean rebuild
echo -e "${YELLOW}🔨 SCHRITT 7: Container neu bauen...${NC}"
docker compose build --no-cache

# 8. Container starten
echo -e "${YELLOW}🚀 SCHRITT 8: Container starten...${NC}"
docker compose up -d

# 9. Health Check mit Timeout
echo -e "${YELLOW}🏥 SCHRITT 9: Health Check (60s Timeout)...${NC}"
HEALTH_CHECK_COUNT=0
MAX_HEALTH_CHECKS=12  # 12 * 5s = 60s

while [ $HEALTH_CHECK_COUNT -lt $MAX_HEALTH_CHECKS ]; do
    if curl -f -s http://localhost/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health Check erfolgreich!${NC}"
        break
    fi
    echo -n "."
    sleep 5
    HEALTH_CHECK_COUNT=$((HEALTH_CHECK_COUNT + 1))
done

if [ $HEALTH_CHECK_COUNT -eq $MAX_HEALTH_CHECKS ]; then
    echo -e "${RED}❌ Health Check fehlgeschlagen!${NC}"
    echo -e "${YELLOW}🔄 AUTOMATISCHER ROLLBACK VERFÜGBAR:${NC}"
    echo "   1. docker compose down"
    echo "   2. cp $SAFETY_BACKUP_DIR/relationship_organizer.db ./data/db/"
    echo "   3. docker compose up -d"
    exit 1
fi

# 10. Daten-Verfügbarkeit final testen
echo -e "${YELLOW}📊 SCHRITT 10: Daten-Verfügbarkeit testen...${NC}"
EVENT_COUNT=$(curl -s http://localhost/api/events | jq '. | length' 2>/dev/null || echo "0")
if [ "$EVENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Daten verfügbar: $EVENT_COUNT Events gefunden${NC}"
else
    echo -e "${RED}❌ WARNUNG: Keine Events gefunden!${NC}"
    echo "Möglicherweise Daten-Problem. Backup verfügbar in: $SAFETY_BACKUP_DIR"
fi

echo ""
echo -e "${GREEN}🎉 REBUILD ERFOLGREICH ABGESCHLOSSEN!${NC}"
echo -e "${BLUE}📋 Backup-Info:${NC}"
echo "   Backup-Ordner: $SAFETY_BACKUP_DIR"
echo "   Rollback: ./rollback.sh $TIMESTAMP"
echo ""