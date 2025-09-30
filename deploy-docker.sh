#!/bin/bash

echo "🚀 BOrganizer Production Deployment Script"
echo "=========================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert. Bitte installiere Docker zuerst."
    exit 1
fi

# Check if Docker Compose is installed  
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ist nicht installiert. Bitte installiere Docker Compose zuerst."
    exit 1
fi

echo "✅ Docker und Docker Compose gefunden"

# Build and start the application
echo "🔨 Baue Docker Images..."
docker-compose build --no-cache

echo "🏃 Starte BOrganizer in Production Mode..."
docker-compose up -d

echo "📊 Status der Container:"
docker-compose ps

echo ""
echo "🎉 BOrganizer läuft jetzt in Production!"
echo "📱 Frontend: http://localhost (über NGINX)"
echo "🔌 Backend API: http://localhost:5000"
echo ""
echo "📋 Nützliche Befehle:"
echo "  - Status: docker-compose ps"
echo "  - Logs: docker-compose logs -f"
echo "  - Stoppen: docker-compose down"
echo "  - Neustarten: docker-compose restart"
echo "  - Updates: git pull && docker-compose up -d --build"