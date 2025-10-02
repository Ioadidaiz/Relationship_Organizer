#!/bin/bash

# BOrganizer Pi Setup Script
# Einmaliges Setup auf dem Raspberry Pi

set -e

echo "🍓 BOrganizer Raspberry Pi Setup"
echo "=================================="

# System Update
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Docker Compose Plugin prüfen
if ! docker compose version &>/dev/null; then
    echo "📦 Installing Docker Compose Plugin..."
    sudo apt install -y docker-compose-plugin
fi

# Benutzer zur Docker-Gruppe hinzufügen
if ! groups $USER | grep -q '\bdocker\b'; then
    echo "👤 Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "⚠️  Please logout and login again for docker group to take effect!"
fi

# Projekt-Verzeichnis wechseln
cd ~/beziehungs-organizer

# .env.pi aus Template erstellen (falls nicht vorhanden)
if [ ! -f .env.pi ]; then
    echo "📝 Creating .env.pi from template..."
    cp .env.pi.template .env.pi 2>/dev/null || echo "# Copy from .env.pi.template and adjust values" > .env.pi
    echo "⚠️  Please edit .env.pi with your Telegram Bot Token!"
    echo "📝 File location: ~/beziehungs-organizer/.env.pi"
fi

# Update-Script ausführbar machen
chmod +x update-pi.sh

# Erstmaliger Build und Start
echo "🔨 Building and starting containers for first time..."
docker compose -f docker-compose.pi.yml --env-file .env.pi up -d --build

# Pi IP anzeigen
PI_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "✅ Setup completed!"
echo "🌐 BOrganizer is running at: http://$PI_IP"
echo "📱 Telegram Bot should be active"
echo ""
echo "📋 Next steps:"
echo "  1. Edit .env.pi with your Telegram Bot Token"
echo "  2. Run ./update-pi.sh to restart with new config"
echo "  3. Test Telegram integration via: curl http://$PI_IP:5000/api/telegram/test"
echo ""