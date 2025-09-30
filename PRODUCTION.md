# 🚀 BOrganizer Production Deployment Guide

Professional Docker-based deployment für den BOrganizer mit NGINX Reverse Proxy, Health Monitoring und automatischen Backups.

## 📋 Voraussetzungen

### Windows:
- Docker Desktop für Windows (https://docs.docker.com/desktop/windows/)
- Git für Windows
- Windows 10/11 oder Windows Server 2019+

### Linux/macOS:
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

## 🏗️ Architektur

```
Internet → NGINX (Port 80/443) → BOrganizer App (Port 5000)
                ↓
        Persistente Volumes:
        - Database (/data/db)
        - Uploads (/data/uploads)  
        - Logs (/data/logs)
```

## 🚀 Quick Start

### Windows:
```batch
# 1. Repository klonen
git clone https://github.com/Ioadidaiz/Relationship_Organizer.git
cd Relationship_Organizer/beziehungs-organizer

# 2. Production deployment starten
deploy-docker.bat
```

### Linux/macOS:
```bash
# 1. Repository klonen
git clone https://github.com/Ioadidaiz/Relationship_Organizer.git
cd Relationship_Organizer/beziehungs-organizer

# 2. Setup ausführen
chmod +x setup-production.sh
./setup-production.sh

# 3. Starten
docker-compose up -d
```

## 📊 Überwachung & Verwaltung

### Status prüfen:
```bash
# Container Status
docker-compose ps

# Logs anzeigen
docker-compose logs -f

# Health Check
curl http://localhost/api/health
```

### Mit Monitoring Tools:
```bash
# Portainer UI starten (optional)
docker-compose --profile monitoring up -d

# Portainer UI: http://localhost:9000
```

## 💾 Backup & Wiederherstellung

### Automatisches Backup:
```bash
# Windows
backup.bat

# Linux/macOS  
./backup.sh
```

### Manuelles Backup:
```bash
# Datenbank Backup
docker-compose exec borganizer cp /app/backend/relationship_organizer.db /app/backend/backup_$(date +%Y%m%d).db

# Uploads Backup
tar -czf uploads_backup.tar.gz data/uploads/
```

### Wiederherstellung:
```bash
# Service stoppen
docker-compose down

# Datenbank wiederherstellen
cp data/backups/db_backup_YYYYMMDD.db data/db/relationship_organizer.db

# Uploads wiederherstellen  
tar -xzf uploads_backup.tar.gz

# Service starten
docker-compose up -d
```

## 🔄 Updates

### Automatisches Update:
```bash
# Windows
update.bat

# Linux/macOS
./update.sh
```

### Manuelles Update:
```bash
# 1. Backup erstellen
./backup.sh

# 2. Neueste Version laden
git pull origin master

# 3. Container neu bauen
docker-compose down
docker-compose build --no-cache  
docker-compose up -d
```

## 🔐 Sicherheit

### Enthaltene Sicherheitsmaßnahmen:
- Non-root Container User
- NGINX Security Headers
- Rate Limiting für API Calls
- File Upload Restrictions
- Container Isolation

### SSL/HTTPS Setup (optional):
```bash
# 1. SSL Zertifikate in ./certs/ ablegen
# 2. NGINX Config anpassen für HTTPS
# 3. Port 443 in docker-compose.yml aktivieren
```

## 📈 Performance Optimierung

### Produktions-Features:
- Multi-stage Docker Build
- NGINX Gzip Compression
- Static File Caching
- Connection Pooling
- Resource Limits

### Monitoring Metriken:
- Container Health Checks
- Response Time Monitoring
- Error Rate Tracking
- Resource Usage

## 🐛 Troubleshooting

### Häufige Probleme:

#### Container startet nicht:
```bash
# Logs prüfen
docker-compose logs borganizer

# Port-Konflikte prüfen
netstat -tulpn | grep :80
netstat -tulpn | grep :5000
```

#### Datenbank-Probleme:
```bash
# Container neu starten
docker-compose restart borganizer

# Datenbank-Permissions prüfen
ls -la data/db/
```

#### Performance-Probleme:
```bash
# Resource Usage prüfen
docker stats

# Container Logs prüfen
docker-compose logs --tail=100 borganizer
```

### Log-Dateien:
- Container Logs: `docker-compose logs`
- NGINX Access: `data/logs/access.log`
- NGINX Error: `data/logs/error.log`
- Application Logs: `data/logs/app.log`

## 🔧 Konfiguration

### Umgebungsvariablen:
```env
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
```

### Volume Pfade anpassen:
```yaml
# In docker-compose.yml
volumes:
  - ./custom/db/path:/app/backend/relationship_organizer.db
  - ./custom/uploads:/app/backend/uploads
```

## 🌐 URLs nach Deployment

- **Frontend**: http://localhost
- **API Health**: http://localhost/api/health
- **Direct Backend**: http://localhost:5000
- **Portainer** (optional): http://localhost:9000

## 📞 Support

Bei Problemen:
1. Logs prüfen: `docker-compose logs`
2. GitHub Issues: https://github.com/Ioadidaiz/Relationship_Organizer/issues
3. Health Check: `curl http://localhost/api/health`

## 📄 Lizenz

Siehe LICENSE Datei im Repository.

---
*BOrganizer Production Deployment - Professional & Isolated* 🚀