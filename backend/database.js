const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Erstelle das data-Verzeichnis falls es nicht existiert
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Erstelle oder öffne die SQLite-Datenbank im data-Verzeichnis
const dbPath = path.join(dataDir, 'relationship_organizer.db');
console.log('🗄️ Datenbank-Pfad:', dbPath);

// Öffne Datenbank mit explizitem READWRITE Modus
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('❌ Fehler beim Öffnen der Datenbank:', err.message);
    } else {
        console.log('✅ Datenbank erfolgreich geöffnet im READWRITE Modus');
    }
});

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

    // Füge image_filenames Spalte hinzu falls sie nicht existiert (für Bilder)
    db.run(`ALTER TABLE tasks ADD COLUMN image_filenames TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Fehler beim Hinzufügen der image_filenames Spalte:', err);
        }
    });

    // Füge image_paths Spalte hinzu falls sie nicht existiert (für Bildpfade)
    db.run(`ALTER TABLE tasks ADD COLUMN image_paths TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error('Fehler beim Hinzufügen der image_paths Spalte:', err);
        }
    });

    // ===== BABY BEREICH TABELLEN =====
    
    // Baby Savings Tabelle für Finanzplan
    db.run(`CREATE TABLE IF NOT EXISTS baby_savings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL DEFAULT 0,
        target REAL NOT NULL DEFAULT 5000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Baby Items Tabelle für Einkaufsliste
    db.run(`CREATE TABLE IF NOT EXISTS baby_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT,
        cost REAL NOT NULL DEFAULT 0,
        image_path TEXT,
        shop_link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Initialisiere Baby Savings mit Standardwert falls leer
    db.get('SELECT COUNT(*) as count FROM baby_savings', (err, row) => {
        if (!err && row.count === 0) {
            db.run('INSERT INTO baby_savings (amount, target) VALUES (0, 5000)');
            console.log('✅ Baby Savings initialisiert');
        }
    });
});

module.exports = db;
