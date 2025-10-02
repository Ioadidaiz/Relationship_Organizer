#!/bin/bash

# BOrganizer Pi Update Script
# Führt automatische Updates auf dem Raspberry Pi durch

set -e  # Exit bei Fehlern

PI_DIR="/home/andreas/beziehungs-organizer"
COMPOSE_FILE="docker-compose.pi.yml"
ENV_FILE=".env.pi"

echo "🚀 Starting BOrganizer Update on Raspberry Pi..."
echo "📍 Working directory: $PI_DIR"

# Zum Projekt-Verzeichnis wechseln
cd "$PI_DIR"

# Git Repository aktualisieren
echo "📡 Pulling latest changes from GitHub..."
git pull origin master

# Prüfen ob .env.pi existiert
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  Warning: $ENV_FILE not found!"
    echo "📝 Please create $ENV_FILE with your Telegram configuration"
    exit 1
fi

# Container stoppen
echo "🛑 Stopping containers..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

# Images neu bauen
echo "🔨 Building new images..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

# Container starten
echo "▶️  Starting containers..."
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Warten auf Healthcheck
echo "🏥 Waiting for health check..."
sleep 30

# Status prüfen
echo "📊 Container Status:"
docker-compose -f "$COMPOSE_FILE" ps

# Pi IP ermitteln
PI_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ BOrganizer Update completed!"
echo "🌐 Web Interface: http://$PI_IP"
echo "📱 Telegram Notifications: Active"
echo "🐳 Docker Status: $(docker-compose -f "$COMPOSE_FILE" ps --format table)"
echo ""
echo "📋 Quick Commands:"
echo "  docker-compose -f $COMPOSE_FILE logs -f     # Live logs"
echo "  docker-compose -f $COMPOSE_FILE ps          # Status"
echo "  docker-compose -f $COMPOSE_FILE down        # Stop all"
echo ""