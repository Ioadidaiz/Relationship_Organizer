const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Erstelle oder öffne die SQLite-Datenbank
const dbPath = path.join(__dirname, 'relationship_organizer.db');
const db = new sqlite3.Database(dbPath);

// Tabellen erstellen
db.serialize(() => {
    // Events Tabelle für Kalendereinträge
    db.run(`CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        end_date TEXT,
        is_recurring INTEGER DEFAULT 0,
        recurrence_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Images Tabelle für Bildverwaltung
    db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        path TEXT NOT NULL,
        size INTEGER,
        mime_type TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Relationships Tabelle für Beziehungsinformationen
    db.run(`CREATE TABLE IF NOT EXISTS relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        relationship_type TEXT,
        description TEXT,
        image_id INTEGER,
        anniversary_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES images (id)
    )`);

    // Event_Images Tabelle für die Verknüpfung von Events und Bildern
    db.run(`CREATE TABLE IF NOT EXISTS event_images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        image_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images (id) ON DELETE CASCADE
    )`);

    // Notizen Tabelle für persönliche Details über Partner
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'allgemein',
        priority INTEGER DEFAULT 1,
        is_favorite BOOLEAN DEFAULT 0,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = db;
