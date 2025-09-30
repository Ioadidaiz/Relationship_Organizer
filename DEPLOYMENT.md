# 🚀 Automatisiertes Deployment

Dieses Verzeichnis enthält Skripte zur Automatisierung des Deployment-Prozesses für den Beziehungs-Organizer.

## 📁 Verfügbare Skripte

### `deploy.ps1` - Hauptskript (PowerShell)
Das vollständige Deployment-Skript mit allen Optionen.

```powershell
# Basis-Deployment mit Commit-Message
.\deploy.ps1 -CommitMessage "Fix modal scrolling issue"

# Mit zusätzlichen Optionen
.\deploy.ps1 -CommitMessage "Major UI update" -Force
```

**Parameter:**
- `-CommitMessage`: Beschreibung der Änderungen
- `-Force`: Deployment auch ohne Änderungen durchführen
- `-SkipTests`: Tests überspringen (für zukünftige Implementierung)

### `deploy.bat` - Windows Batch Wrapper
Vereinfachter Zugriff über Batch-Datei.

```cmd
deploy.bat "Your commit message here"
```

### `quick-deploy.bat` - Schnell-Deployment
Ein-Klick-Deployment mit automatischer Timestamp-Message.

```cmd
quick-deploy.bat
```

## 🔄 Was passiert beim Deployment?

1. **Git Workflow:**
   - Prüfung des aktuellen Status
   - Wechsel zu `development` branch
   - Änderungen committen und pushen
   - Wechsel zu `master` branch
   - Merge von `development` nach `master`
   - Push des `master` branch
   - Rückkehr zu `development` branch

2. **Docker Production Update:**
   - Pull der neuesten Images
   - Stoppen der laufenden Container
   - Rebuild der Container mit neuen Änderungen
   - Start der Container
   - Health Check Überwachung

3. **Verifikation:**
   - Container-Status prüfung
   - Erfolgsmeldung mit URL

## ⚠️ Voraussetzungen

- Git muss installiert und konfiguriert sein
- Docker und Docker Compose müssen laufen
- PowerShell Execution Policy muss Skripte erlauben
- Aktuelle Arbeitsverzeichnis muss das Projektverzeichnis sein

## 🔧 Troubleshooting

### PowerShell Execution Policy Fehler
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Git Authentifizierung
Stelle sicher, dass Git mit deinem GitHub Account authentifiziert ist:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Docker nicht verfügbar
Starte Docker Desktop und warte bis alle Services laufen.

## 🎯 Verwendungsempfehlungen

### Für schnelle Fixes:
```cmd
quick-deploy.bat
```

### Für Features mit aussagekräftiger Message:
```cmd
deploy.bat "Add user authentication system"
```

### Für komplexe Deployments mit Kontrolle:
```powershell
.\deploy.ps1 -CommitMessage "Major refactoring" -Force
```

## 📊 Status-Übersicht

Nach erfolgreichem Deployment:
- ✅ Code ist auf GitHub synchronisiert
- ✅ Production Container laufen mit neuesten Änderungen  
- ✅ Anwendung verfügbar unter: http://localhost
- ✅ Alle Daten bleiben durch Docker Volumes erhalten

## 🔄 Rollback bei Problemen

Falls etwas schief geht, ist das Skript so designed, dass:
1. Automatischer Rollback zu `development` branch
2. Container bleiben in vorherigem Zustand
3. Git-History bleibt sauber

Manueller Rollback:
```bash
git checkout development
docker-compose down
docker-compose up -d
```