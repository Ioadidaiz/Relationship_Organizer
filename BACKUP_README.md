# 🗄️ BOrganizer Backup System

Automatisches Backup-System für BOrganizer mit Google Drive Integration.

## 📋 Setup-Schritte

### 1. Google Drive Konfiguration

```bash
# rclone konfigurieren
rclone config

# Folgen Sie der interaktiven Anleitung:
# - Name: gdrive
# - Storage: drive (Google Drive)
# - Scope: drive (Full access)
# - Auto config: n (wegen SSH)
# - Autorisieren Sie im Browser und kopieren Sie den Code
```

### 2. Backup-System installieren

```bash
# Cron-Job hinzufügen (wöchentlich Sonntags 3:00 Uhr)
crontab -e

# Fügen Sie diese Zeile hinzu:
0 3 * * 0 /home/andreas/beziehungs-organizer/backup-database.sh
```

### 3. Log-Datei vorbereiten

```bash
# Log-Datei erstellen und Berechtigungen setzen
sudo touch /var/log/borganizer-backup.log
sudo chown andreas:andreas /var/log/borganizer-backup.log
```

## 🚀 Verwendung

### Manuelles Backup

```bash
# Backup jetzt erstellen
./backup-database.sh
```

### Backups auflisten

```bash
# Verfügbare Backups anzeigen
./restore-database.sh --list
```

### Backup wiederherstellen

```bash
# Spezifisches Backup wiederherstellen
./restore-database.sh --restore borganizer_backup_20251002_140000.tar.gz
```

## 📦 Was wird gesichert

1. **SQLite-Datenbank** (`relationship_organizer.db`)
2. **Upload-Ordner** (Bilder und Dateien)
3. **Log-Dateien** (falls vorhanden)
4. **Konfigurationsdateien** (docker-compose.pi.yml, .env.pi, nginx.conf)
5. **System-Informationen** (Pi-Model, Docker-Version, etc.)

## 🔄 Automatisierung

- **Wöchentlich**: Jeden Sonntag um 3:00 Uhr
- **Retention**: Behält Backups für 4 Wochen (28 Tage)
- **Benachrichtigungen**: Telegram-Nachrichten bei Erfolg/Fehler
- **Logs**: Alle Aktivitäten in `/var/log/borganizer-backup.log`

## 📱 Telegram-Integration

Das System sendet automatisch Telegram-Nachrichten bei:
- ✅ Erfolgreichem Backup
- ❌ Backup-Fehlern
- 🔄 Restore-Operationen

## 📊 Backup-Struktur

```
Google Drive/BOrganizer-Backups/
├── borganizer_backup_20251002_030000.tar.gz
├── borganizer_backup_20251009_030000.tar.gz
├── borganizer_backup_20251016_030000.tar.gz
└── borganizer_backup_20251023_030000.tar.gz
```

## 🛠️ Troubleshooting

### Google Drive Verbindung testen

```bash
rclone ls gdrive:
```

### Backup-Script testen

```bash
# Test-Run ohne Upload
./backup-database.sh --dry-run
```

### Log-Dateien prüfen

```bash
tail -f /var/log/borganizer-backup.log
```

## 🔐 Sicherheit

- Backups werden verschlüsselt übertragen (HTTPS)
- Google Drive verwendet OAuth2-Authentifizierung
- Lokale temporäre Dateien werden automatisch gelöscht
- Sensitive Daten (Telegram-Token) werden nicht geloggt

## 📈 Monitoring

Das System erstellt detaillierte Logs mit:
- Backup-Größe und -Dauer
- Erfolgs-/Fehlerstatus
- System-Ressourcen zum Backup-Zeitpunkt
- Upload-Geschwindigkeit zu Google Drive