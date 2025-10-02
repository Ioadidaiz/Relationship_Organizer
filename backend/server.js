const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

// Telegram Services
const TaskScheduler = require('./services/TaskScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Telegram Scheduler initialisieren
let taskScheduler = null;
try {
    taskScheduler = new TaskScheduler();
    // Starte Scheduler nach kurzer Verzögerung um sicherzustellen dass DB bereit ist
    setTimeout(() => {
        if (taskScheduler) {
            taskScheduler.start();
        }
    }, 3000);
} catch (error) {
    console.warn('⚠️ Telegram-Integration deaktiviert:', error.message);
}

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
        fileSize: 50 * 1024 * 1024, // 50MB Limit erhöht
        files: 1 // Nur eine Datei pro Request
    }
});

// Statische Dateien für Bilder
app.use('/uploads', express.static(uploadsDir));

// Health Check für Docker/Production
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

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
    const { title, description, date, end_date, is_recurring, recurrence_type } = req.body;
    
    if (!title || !date) {
        return res.status(400).json({ error: 'Titel und Datum sind erforderlich' });
    }
    
    db.run(`
        INSERT INTO events (title, description, date, end_date, is_recurring, recurrence_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `, [title, description, date, end_date, is_recurring ? 1 : 0, recurrence_type], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        res.json({
            id: this.lastID,
            title,
            description,
            date,
            end_date,
            is_recurring: is_recurring ? 1 : 0,
            recurrence_type,
            images: []
        });
    });
});

// Event aktualisieren
app.put('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    const { title, description, date, end_date, is_recurring, recurrence_type } = req.body;
    
    db.run(`
        UPDATE events 
        SET title = ?, description = ?, date = ?, end_date = ?, is_recurring = ?, 
            recurrence_type = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [title, description, date, end_date, is_recurring ? 1 : 0, recurrence_type, eventId], function(err) {
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
    
    // Erst das Event mit zugehörigen Bildern abrufen
    db.get('SELECT * FROM events WHERE id = ?', [eventId], (err, event) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!event) {
            return res.status(404).json({ error: 'Event nicht gefunden' });
        }
        
        // Zugehörige Bilder über event_images Tabelle finden
        db.all(`
            SELECT i.filename, i.path 
            FROM images i 
            JOIN event_images ei ON i.id = ei.image_id 
            WHERE ei.event_id = ?
        `, [eventId], (err, images) => {
            if (err) {
                console.warn('Warnung: Fehler beim Abrufen der Event-Bilder:', err.message);
            }
            
            // Event aus Datenbank löschen
            db.run('DELETE FROM events WHERE id = ?', [eventId], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                
                // Event_Images Verknüpfungen löschen (CASCADE sollte das automatisch machen)
                db.run('DELETE FROM event_images WHERE event_id = ?', [eventId], (err) => {
                    if (err) {
                        console.warn('Warnung: Fehler beim Löschen der Event-Image-Verknüpfungen:', err.message);
                    }
                });
                
                // Bild-Dateien vom Dateisystem löschen
                if (images && images.length > 0) {
                    images.forEach(image => {
                        // Korrigierter Pfad - Bilder sind in backend/uploads
                        const imagePath = path.join(__dirname, 'uploads', image.filename);
                        console.log('Versuche Event-Bild zu löschen:', imagePath);
                        
                        fs.unlink(imagePath, (unlinkErr) => {
                            if (unlinkErr) {
                                console.warn('Warnung: Event-Bild konnte nicht gelöscht werden:', unlinkErr.message);
                                console.warn('Pfad war:', imagePath);
                            } else {
                                console.log('✅ Event-Bild erfolgreich gelöscht:', image.path);
                            }
                        });
                    });
                    
                    // Optional: Auch die Bild-Einträge aus der images Tabelle löschen
                    // (nur wenn sie nicht von anderen Events verwendet werden)
                    const imageIds = images.map(img => img.id || 'NULL').join(',');
                    if (imageIds && imageIds !== 'NULL') {
                        db.run(`DELETE FROM images WHERE id IN (${imageIds})`, (err) => {
                            if (err) {
                                console.warn('Warnung: Fehler beim Löschen der Bild-Datensätze:', err.message);
                            } else {
                                console.log('✅ Event-Bild-Datensätze aus DB gelöscht');
                            }
                        });
                    }
                }
                
                res.json({ message: 'Event und zugehörige Bilder erfolgreich gelöscht' });
            });
        });
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

// Hero Image Upload
app.post('/api/upload-hero', upload.single('heroImage'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Keine Hero Image Datei hochgeladen' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const heroImageDir = path.join(__dirname, '..', 'public');
    const publicHeroPath = path.join(heroImageDir, 'hero-image.jpg');
    
    try {
        // Lösche das alte Hero Image falls vorhanden
        if (fs.existsSync(publicHeroPath)) {
            fs.unlinkSync(publicHeroPath);
        }
        
        // Kopiere das neue Hero Image in den public Ordner
        const uploadedFilePath = path.join(uploadsDir, req.file.filename);
        fs.copyFileSync(uploadedFilePath, publicHeroPath);
        
        // Lösche das temporäre Upload-File
        fs.unlinkSync(uploadedFilePath);
        
        console.log('✅ Hero Image erfolgreich aktualisiert:', req.file.originalname);
        
        res.json({
            success: true,
            message: 'Hero Image erfolgreich aktualisiert',
            imagePath: '/hero-image.jpg',
            originalName: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('❌ Hero Image Upload Error:', error);
        res.status(500).json({ 
            error: 'Hero Image konnte nicht gespeichert werden',
            details: error.message 
        });
    }
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

// ===== NOTIZEN ROUTEN =====

// Alle Notizen abrufen
app.get('/api/notes', (req, res) => {
    const { category, search } = req.query;
    
    let query = 'SELECT * FROM notes WHERE 1=1';
    let params = [];
    
    if (category && category !== 'alle') {
        query += ' AND category = ?';
        params.push(category);
    }
    
    if (search) {
        query += ' AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY priority DESC, updated_at DESC';
    
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Einzelne Notiz abrufen
app.get('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    
    db.get('SELECT * FROM notes WHERE id = ?', [noteId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        res.json(row);
    });
});

// Neue Notiz erstellen (mit optionalem Bild)
app.post('/api/notes', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Datei ist zu groß. Maximal 50MB erlaubt.' });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ error: 'Zu viele Dateien. Nur eine Datei erlaubt.' });
                }
                return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
            }
            return res.status(400).json({ error: err.message });
        }

        const { title, content, category, priority, is_favorite, tags } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Titel und Inhalt sind erforderlich' });
        }

        const image_path = req.file ? `/uploads/${req.file.filename}` : null;
        
        db.run(`
            INSERT INTO notes (title, content, category, priority, is_favorite, tags, image_path)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [title, content, category || 'allgemein', priority || 1, is_favorite || 0, tags || '', image_path], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            res.json({
                id: this.lastID,
                title,
                content,
                category: category || 'allgemein',
                priority: priority || 1,
                is_favorite: is_favorite || 0,
                tags: tags || '',
                image_path
            });
        });
    });
});

// Notiz aktualisieren
app.put('/api/notes/:id', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'Datei ist zu groß. Maximal 50MB erlaubt.' });
                }
                if (err.code === 'LIMIT_FILE_COUNT') {
                    return res.status(400).json({ error: 'Zu viele Dateien. Nur eine Datei erlaubt.' });
                }
                return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
            }
            return res.status(400).json({ error: err.message });
        }

        const noteId = req.params.id;
        const { title, content, category, priority, is_favorite, tags } = req.body;
        
        // Wenn ein neues Bild hochgeladen wurde
        const image_path = req.file ? `/uploads/${req.file.filename}` : undefined;
        
        let query, params;
        
        if (image_path) {
            // Mit Bild-Update
            query = `
                UPDATE notes 
                SET title = ?, content = ?, category = ?, priority = ?, is_favorite = ?, tags = ?, image_path = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            params = [title, content, category, priority, is_favorite, tags, image_path, noteId];
        } else {
            // Ohne Bild-Update (behält vorhandenes Bild)
            query = `
                UPDATE notes 
                SET title = ?, content = ?, category = ?, priority = ?, is_favorite = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            params = [title, content, category, priority, is_favorite, tags, noteId];
        }
        
        db.run(query, params, function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Notiz nicht gefunden' });
            }
            
            res.json({ message: 'Notiz erfolgreich aktualisiert' });
        });
    });
});

// Notiz löschen
app.delete('/api/notes/:id', (req, res) => {
    const noteId = req.params.id;
    
    // Erst die Notiz mit Bild-Info abrufen
    db.get('SELECT image_path FROM notes WHERE id = ?', [noteId], (err, note) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        if (!note) {
            return res.status(404).json({ error: 'Notiz nicht gefunden' });
        }
        
        // Notiz aus Datenbank löschen
        db.run('DELETE FROM notes WHERE id = ?', [noteId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Wenn ein Bild vorhanden ist, auch das Bild löschen
            if (note.image_path) {
                // Bild-Pfad korrekt erstellen - Bilder sind in backend/uploads, nicht public/uploads
                const imagePath = path.join(__dirname, 'uploads', path.basename(note.image_path));
                console.log('Versuche Bild zu löschen:', imagePath);
                
                fs.unlink(imagePath, (unlinkErr) => {
                    if (unlinkErr) {
                        console.warn('Warnung: Bild konnte nicht gelöscht werden:', unlinkErr.message);
                        console.warn('Pfad war:', imagePath);
                    } else {
                        console.log('✅ Bild erfolgreich gelöscht:', note.image_path);
                    }
                });
            }
            
            res.json({ message: 'Notiz und zugehöriges Bild erfolgreich gelöscht' });
        });
    });
});

// ===== PROJEKT/PLANER ENDPOINTS =====

// Alle Projekte abrufen
app.get('/api/projects', (req, res) => {
    const sql = 'SELECT * FROM projects ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Laden der Projekte:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Neues Projekt erstellen
app.post('/api/projects', (req, res) => {
    const { title, description, status, priority, linked_event_id, due_date, color } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Titel ist erforderlich' });
    }
    
    const sql = `INSERT INTO projects (title, description, status, priority, linked_event_id, due_date, color) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, description, status || 'todo', priority || 'medium', linked_event_id, due_date, color], function(err) {
        if (err) {
            console.error('Fehler beim Erstellen des Projekts:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Das erstellte Projekt zurückgeben
        db.get('SELECT * FROM projects WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                console.error('Fehler beim Abrufen des erstellten Projekts:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
});

// Projekt aktualisieren
app.put('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority, linked_event_id, due_date, color } = req.body;
    
    const sql = `UPDATE projects 
                 SET title = ?, description = ?, status = ?, priority = ?, 
                     linked_event_id = ?, due_date = ?, color = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    
    db.run(sql, [title, description, status, priority, linked_event_id, due_date, color, id], function(err) {
        if (err) {
            console.error('Fehler beim Aktualisieren des Projekts:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }
        
        // Das aktualisierte Projekt zurückgeben
        db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Fehler beim Abrufen des aktualisierten Projekts:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
});

// Projekt löschen
app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM projects WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Fehler beim Löschen des Projekts:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Projekt nicht gefunden' });
        }
        
        res.json({ message: 'Projekt erfolgreich gelöscht' });
    });
});

// ===== TASKS API =====
// GET alle Tasks
app.get('/api/tasks', (req, res) => {
    const sql = 'SELECT * FROM tasks ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Tasks:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST neue Task erstellen
app.post('/api/tasks', (req, res) => {
    const { title, description, status, project_id, due_date, result } = req.body;
    
    if (!title || !project_id) {
        return res.status(400).json({ error: 'Titel und Projekt-ID sind erforderlich' });
    }
    
    const sql = `INSERT INTO tasks (title, description, status, project_id, due_date, result) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [title, description, status || 'todo', project_id, due_date, result], function(err) {
        if (err) {
            console.error('Fehler beim Erstellen der Task:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        // Gib die neue Task zurück
        db.get('SELECT * FROM tasks WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                console.error('Fehler beim Abrufen der erstellten Task:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.status(201).json(row);
        });
    });
});

// PUT Task aktualisieren
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, status, due_date, result } = req.body;
    
    const sql = `UPDATE tasks 
                 SET title = ?, description = ?, status = ?, due_date = ?, result = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`;
    
    db.run(sql, [title, description, status, due_date, result, id], function(err) {
        if (err) {
            console.error('Fehler beim Aktualisieren der Task:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        
        // Gib die aktualisierte Task zurück
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
            if (err) {
                console.error('Fehler beim Abrufen der aktualisierten Task:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            res.json(row);
        });
    });
});

// DELETE Task löschen
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    const sql = 'DELETE FROM tasks WHERE id = ?';
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Fehler beim Löschen der Task:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        
        res.json({ message: 'Task erfolgreich gelöscht' });
    });
});

// ===== TELEGRAM API ENDPOINTS =====

// Telegram Test-Nachricht senden
app.post('/api/telegram/test', async (req, res) => {
    if (!taskScheduler) {
        return res.status(503).json({ error: 'Telegram-Service nicht verfügbar' });
    }
    
    try {
        // Direkte Test-Nachricht ohne TaskSummary
        const TelegramService = require('./services/TelegramService');
        const telegramService = new TelegramService();
        const success = await telegramService.sendMessage('🧪 *Test-Nachricht*\n\nDas Telegram-Feature funktioniert! ✅');
        
        res.json({ 
            success, 
            message: success ? 'Test-Nachricht erfolgreich gesendet' : 'Fehler beim Senden der Test-Nachricht' 
        });
    } catch (error) {
        console.error('❌ Fehler beim Telegram-Test:', error);
        res.status(500).json({ error: error.message });
    }
});

// Telegram Scheduler Status abrufen
app.get('/api/telegram/status', (req, res) => {
    if (!taskScheduler) {
        return res.json({ 
            enabled: false, 
            error: 'Telegram-Service nicht verfügbar' 
        });
    }
    
    res.json(taskScheduler.getStatus());
});

// Telegram Scheduler aktivieren/deaktivieren
app.post('/api/telegram/toggle', (req, res) => {
    if (!taskScheduler) {
        return res.status(503).json({ error: 'Telegram-Service nicht verfügbar' });
    }
    
    const { enabled } = req.body;
    taskScheduler.setEnabled(enabled);
    res.json({ 
        enabled: taskScheduler.getStatus().enabled, 
        message: `Telegram-Benachrichtigungen ${enabled ? 'aktiviert' : 'deaktiviert'}` 
    });
});

// Serve static files from React build in production (MUST be after all API routes)
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../build');
    app.use(express.static(buildPath));
    
    // Catch all handler for React Router - MUST be last!
    app.get('*', (req, res) => {
        // Skip API routes (they should be handled above)
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// Server starten
app.listen(PORT, () => {
    console.log(`🚀 Backend Server läuft auf Port ${PORT}`);
    console.log(`📊 SQLite Datenbank initialisiert`);
    console.log(`🖼️  Upload-Ordner: ${uploadsDir}`);
});

module.exports = app;
