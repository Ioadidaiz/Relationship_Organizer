# 🛡️ SICHERE ENTWICKLUNG - Niemals Daten verlieren!

## 📋 Garantierte Datensicherheit

### ✅ Was ist BEREITS SICHER:
- **Bind Mounts**: Alle Daten sind in `./data/` auf dem Host gespeichert
- **Persistenz**: Container-Rebuilds überschreiben KEINE Daten
- **Automatische Backups**: Vor jedem Rebuild

---

## 🔧 SICHERE ENTWICKLUNGS-WORKFLOWS

### Option 1: 🚀 **Lokale Entwicklung (Empfohlen)**
```bash
# Code ändern im Editor (VS Code, etc.)
# Keine Container nötig für Frontend-Entwicklung
npm start                    # Frontend auf Port 3000
# API bleibt auf Production (Port 80/5000)
```

### Option 2: 🐳 **Container-basierte Entwicklung**
```bash
# 1. IMMER zuerst Backup
./quick-backup.sh

# 2. Development Container starten
./start-dev.sh

# 3. Nach Entwicklung: Production wiederherstellen
docker compose -f docker-compose.dev.yml down
docker compose up -d
```

### Option 3: 🛡️ **Ultra-sicherer Production Update**
```bash
# 1. Code entwickeln und testen
git add .
git commit -m "Feature: Description"
git push origin development

# 2. In Master mergen
git checkout master
git merge development
git push origin master

# 3. Sicherer Rebuild mit ALLEN Sicherheitschecks
./safe-rebuild.sh
```

---

## 🆘 NOTFALL-KOMMANDOS

### ⚡ Quick Backup (vor kritischen Änderungen)
```bash
./quick-backup.sh
```

### 🔄 Rollback (bei Problemen)
```bash
# Verfügbare Backups anzeigen
./rollback.sh

# Zu spezifischem Backup zurück
./rollback.sh 20251014_143022
```

### 🩺 Gesundheitscheck
```bash
# System Status
docker compose ps
curl http://localhost/api/health

# Daten prüfen
curl http://localhost/api/events | jq '. | length'
```

---

## 🔒 DATEN-SCHUTZ GARANTIEN

### ✅ Was NIEMALS verloren geht:
- **Datenbank**: `./data/db/relationship_organizer.db`
- **Uploads**: `./data/uploads/`
- **Logs**: `./data/logs/`

### ✅ Automatische Sicherungen bei:
- Jedem `./safe-rebuild.sh`
- Vor Container-Updates
- Bei Git-basierten Deployments

### ✅ Rollback-Möglichkeiten:
- Zu jedem automatischen Backup
- Zu manuellen Backups
- Mit einem Kommando

---

## 📈 EMPFOHLENER WORKFLOW

### Für kleine Änderungen:
1. **Lokale Entwicklung** ohne Container
2. **Git commit & push**
3. **`./safe-rebuild.sh`** auf Server

### Für große Features:
1. **`./quick-backup.sh`** (manueller Schutz)
2. **Development Branch** verwenden
3. **Testing** in Development
4. **Merge** nach Master
5. **`./safe-rebuild.sh`** auf Server

### Bei Problemen:
1. **`./rollback.sh`** zu letztem bekannt guten Zustand
2. **Problem analysieren**
3. **Fix implementieren**
4. **Erneut testen**

---

## 🚫 WAS NIEMALS TUN:

❌ `docker compose down -v` (löscht Volumes)  
❌ `rm -rf ./data/` (löscht alle Daten)  
❌ `docker volume prune` (löscht alle Volumes)  
❌ Container-Updates ohne Backup  

## ✅ WAS IMMER SICHER IST:

✅ `docker compose down && docker compose up -d`  
✅ `docker compose build --no-cache`  
✅ Code-Änderungen committen  
✅ `./safe-rebuild.sh` verwenden  

---

**🎯 FAZIT: Mit diesem System können Sie risikolos entwickeln!**