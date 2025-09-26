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
        image_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Füge image_path Spalte hinzu falls sie nicht existiert (für bestehende Datenbanken)
    db.run(`ALTER TABLE notes ADD COLUMN image_path TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Fehler beim Hinzufügen der image_path Spalte:', err);
        }
    });

    // Projekte Tabelle für Kanban Board / Planer
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'done')),
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
        linked_event_id INTEGER,
        due_date TEXT,
        color TEXT DEFAULT '#4a9eff',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (linked_event_id) REFERENCES events (id) ON DELETE SET NULL
    )`);

    // Tasks Tabelle für Kanban Board Aufgaben
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo' CHECK(status IN ('todo', 'in-progress', 'done')),
        project_id INTEGER NOT NULL,
        due_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
    )`);

    // Füge due_date Spalte hinzu falls sie nicht existiert (für bestehende Datenbanken)
    db.run(`ALTER TABLE tasks ADD COLUMN due_date TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Fehler beim Hinzufügen der due_date Spalte:', err);
        }
    });

    // Füge result Spalte hinzu falls sie nicht existiert (für Antworten/Resultate)
    db.run(`ALTER TABLE tasks ADD COLUMN result TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Fehler beim Hinzufügen der result Spalte:', err);
        }
    });
});

module.exports = db;
