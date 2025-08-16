const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Stelle sicher, dass der uploads-Ordner existiert
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer-Konfiguration für Dateiuploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Nur Bilder erlauben
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Nur Bilddateien sind erlaubt!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB Limit
    }
});

// Statische Dateien für Bilder
app.use('/uploads', express.static(uploadsDir));

// ===== EVENTS ROUTEN =====

// Alle Events abrufen
app.get('/api/events', (req, res) => {
    db.all(`
        SELECT e.*, 
               GROUP_CONCAT(i.filename) as image_filenames,
               GROUP_CONCAT(i.path) as image_paths
        FROM events e
        LEFT JOIN event_images ei ON e.id = ei.event_id
        LEFT JOIN images i ON ei.image_id = i.id
        GROUP BY e.id
        ORDER BY e.date ASC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Parse die Bilder-Strings zurück zu Arrays
        const events = rows.map(event => ({
            ...event,
            images: event.image_filenames ? 
                event.image_filenames.split(',').map((filename, index) => ({
                    filename,
                    path: event.image_paths.split(',')[index]
                })) : []
        }));
        
        res.json(events);
    });
});

// Einzelnes Event abrufen
app.get('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    
    db.get(`
        SELECT e.*, 
               GROUP_CONCAT(i.filename) as image_filenames,
               GROUP_CONCAT(i.path) as image_paths
        FROM events e
        LEFT JOIN event_images ei ON e.id = ei.event_id
        LEFT JOIN images i ON ei.image_id = i.id
        WHERE e.id = ?
        GROUP BY e.id
    `, [eventId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Event nicht gefunden' });
        }
        
        const event = {
            ...row,
            images: row.image_filenames ? 
                row.image_filenames.split(',').map((filename, index) => ({
                    filename,
                    path: row.image_paths.split(',')[index]
                })) : []
        };
        
        res.json(event);
    });
});

// Neues Event erstellen
app.post('/api/events', (req, res) => {
    const { title, description, date, is_recurring, recurrence_type } = req.body;
    
    if (!title || !date) {
        return res.status(400).json({ error: 'Titel und Datum sind erforderlich' });
    }
    
    db.run(`
        INSERT INTO events (title, description, date, is_recurring, recurrence_type)
        VALUES (?, ?, ?, ?, ?)
    `, [title, description, date, is_recurring ? 1 : 0, recurrence_type], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            id: this.lastID,
            title,
            description,
            date,
            is_recurring: is_recurring ? 1 : 0,
            recurrence_type,
            images: []
        });
    });
});

// Event aktualisieren
app.put('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    const { title, description, date, is_recurring, recurrence_type } = req.body;
    
    db.run(`
        UPDATE events 
        SET title = ?, description = ?, date = ?, is_recurring = ?, 
            recurrence_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [title, description, date, is_recurring ? 1 : 0, recurrence_type, eventId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Event nicht gefunden' });
        }
        
        res.json({ message: 'Event erfolgreich aktualisiert' });
    });
});

// Event löschen
app.delete('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    
    db.run('DELETE FROM events WHERE id = ?', [eventId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Event nicht gefunden' });
        }
        
        res.json({ message: 'Event erfolgreich gelöscht' });
    });
});

// ===== BILDER ROUTEN =====

// Bild hochladen
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }
    
    const { description } = req.body;
    const filePath = `/uploads/${req.file.filename}`;
    
    db.run(`
        INSERT INTO images (filename, original_name, path, size, mime_type, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [
        req.file.filename,
        req.file.originalname,
        filePath,
        req.file.size,
        req.file.mimetype,
        description || ''
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            id: this.lastID,
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: filePath,
            size: req.file.size,
            mimeType: req.file.mimetype,
            description: description || ''
        });
    });
});

// Alle Bilder abrufen
app.get('/api/images', (req, res) => {
    db.all('SELECT * FROM images ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Bild zu Event hinzufügen
app.post('/api/events/:eventId/images/:imageId', (req, res) => {
    const { eventId, imageId } = req.params;
    
    db.run(`
        INSERT INTO event_images (event_id, image_id)
        VALUES (?, ?)
    `, [eventId, imageId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Bild erfolgreich zu Event hinzugefügt' });
    });
});

// ===== BEZIEHUNGEN ROUTEN =====

// Alle Beziehungen abrufen
app.get('/api/relationships', (req, res) => {
    db.all(`
        SELECT r.*, i.filename as image_filename, i.path as image_path
        FROM relationships r
        LEFT JOIN images i ON r.image_id = i.id
        ORDER BY r.created_at DESC
    `, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Neue Beziehung erstellen
app.post('/api/relationships', (req, res) => {
    const { name, relationship_type, description, anniversary_date, image_id } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    db.run(`
        INSERT INTO relationships (name, relationship_type, description, anniversary_date, image_id)
        VALUES (?, ?, ?, ?, ?)
    `, [name, relationship_type, description, anniversary_date, image_id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            id: this.lastID,
            name,
            relationship_type,
            description,
            anniversary_date,
            image_id
        });
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 Backend Server läuft auf Port ${PORT}`);
    console.log(`📊 SQLite Datenbank initialisiert`);
    console.log(`🖼️  Upload-Ordner: ${uploadsDir}`);
});

module.exports = app;
