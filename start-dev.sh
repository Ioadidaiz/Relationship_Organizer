#!/bin/bash

# Development Environment Script
# Nutzt docker-compose.dev.yml für Live-Code-Updates

echo "🔧 Starte Development Environment..."

# Prüfe ob Development Branch aktiv ist
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo "⚠️  Sie sind auf Branch '$CURRENT_BRANCH'."
    echo "Für Development sollten Sie auf 'development' Branch sein."
    echo "Wechseln? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        git checkout development
    fi
fi

# Stoppe Production Container falls sie laufen
echo "🛑 Stoppe Production Container..."
docker compose -f docker-compose.yml down 2>/dev/null

# Starte Development Environment
echo "🚀 Starte Development Environment..."
docker compose -f docker-compose.dev.yml up -d

echo "✅ Development Environment gestartet!"
echo "📝 Code-Änderungen werden live übernommen"
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend API: http://localhost:5000"
echo "📊 Logs anzeigen: docker compose -f docker-compose.dev.yml logs -f"