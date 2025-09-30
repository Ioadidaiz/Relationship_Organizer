# Automatisiertes Deployment-Skript für Beziehungs-Organizer
# Führt den kompletten Workflow aus: Git Push → Merge → Docker Update

param(
    [string]$CommitMessage = "Automated deployment",
    [switch]$SkipTests = $false,
    [switch]$Force = $false
)

# Konfiguration
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevelopmentBranch = "development"
$MasterBranch = "master"

# Farb-Output Funktionen
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

# Fehlerbehandlung
$ErrorActionPreference = "Stop"

try {
    Write-Info "🚀 Starte automatisierten Deployment-Prozess..."
    Write-Info "📁 Arbeitsverzeichnis: $ProjectRoot"
    
    # Ins Projektverzeichnis wechseln
    Set-Location $ProjectRoot
    
    # 1. Git-Status prüfen
    Write-Info "🔍 Prüfe Git-Status..."
    $gitStatus = git status --porcelain
    
    if (-not $gitStatus -and -not $Force) {
        Write-Warning "Keine Änderungen gefunden. Verwende -Force um trotzdem fortzufahren."
        exit 0
    }
    
    # 2. Auf development branch sein
    $currentBranch = git branch --show-current
    if ($currentBranch -ne $DevelopmentBranch) {
        Write-Info "🔄 Wechsle zu $DevelopmentBranch branch..."
        git checkout $DevelopmentBranch
    }
    
    # 3. Änderungen committen und pushen
    if ($gitStatus) {
        Write-Info "📝 Committe Änderungen..."
        git add .
        git commit -m $CommitMessage
        
        Write-Info "📤 Pushe $DevelopmentBranch branch..."
        git push origin $DevelopmentBranch
        Write-Success "Development branch gepusht"
    }
    
    # 4. Zu master wechseln und mergen
    Write-Info "🔄 Wechsle zu $MasterBranch branch..."
    git checkout $MasterBranch
    
    Write-Info "🔀 Merge $DevelopmentBranch in $MasterBranch..."
    git merge $DevelopmentBranch
    
    Write-Info "📤 Pushe $MasterBranch branch..."
    git push origin $MasterBranch
    Write-Success "Master branch aktualisiert"
    
    # 5. Zurück zu development
    Write-Info "🔄 Wechsle zurück zu $DevelopmentBranch..."
    git checkout $DevelopmentBranch
    
    # 6. Docker Container aktualisieren
    Write-Info "🐳 Aktualisiere Docker Production..."
    
    # Docker Images pullen
    Write-Info "📥 Pulling latest images..."
    docker-compose pull
    
    # Container stoppen
    Write-Info "🛑 Stoppe laufende Container..."
    docker-compose down
    
    # Neu builden und starten
    Write-Info "🔨 Rebuilding und starte Container..."
    docker-compose up -d --build
    
    # Warten bis Container healthy sind
    Write-Info "⏳ Warte auf Container Health Check..."
    $maxWait = 60
    $waited = 0
    
    do {
        Start-Sleep -Seconds 2
        $waited += 2
        $status = docker-compose ps --format json | ConvertFrom-Json
        $healthy = $status | Where-Object { $_.Health -eq "healthy" -or $_.State -eq "running" }
        
        if ($waited -ge $maxWait) {
            Write-Warning "Timeout erreicht. Container Status wird manuell geprüft."
            break
        }
    } while ($healthy.Count -lt 2)
    
    # Finale Status-Prüfung
    Write-Info "📊 Container Status:"
    docker-compose ps
    
    Write-Success "🎉 Deployment erfolgreich abgeschlossen!"
    Write-Info "🌐 Anwendung verfügbar unter: http://localhost"
    
} catch {
    Write-Error "Deployment fehlgeschlagen: $($_.Exception.Message)"
    Write-Info "🔄 Versuche Rollback zu development branch..."
    
    try {
        git checkout $DevelopmentBranch
        Write-Info "✅ Rollback zu development erfolgreich"
    } catch {
        Write-Error "Rollback fehlgeschlagen. Manueller Eingriff erforderlich."
    }
    
    exit 1
}

Write-Info "✨ Deployment-Prozess beendet"