# Beziehungs-Organizer API Dokumentation

**Version:** 1.0  
**Letztes Update:** 3. November 2025  
**Base URL:** `http://192.168.178.45` (Production) oder `http://localhost:5000` (Development)

---

## 📋 Inhaltsverzeichnis

1. [Datenmodelle](#datenmodelle)
2. [Events API](#events-api)
3. [Tasks API](#tasks-api)
4. [Projects API](#projects-api)
5. [Notes API](#notes-api)
6. [Images API](#images-api)
7. [Relationships API](#relationships-api)
8. [Baby API](#baby-api)
9. [Health Check](#health-check)

---

## 🗂️ Datenmodelle

### Event
```javascript
{
  id: number,                    // Auto-increment ID
  title: string,                 // Titel des Events
  description?: string,          // Optionale Beschreibung
  date: string,                  // Startdatum (ISO 8601: YYYY-MM-DD)
  end_date?: string,             // Enddatum für mehrtägige Events
  is_recurring: 0 | 1,          // Wiederkehrend (Boolean als Integer)
  recurrence_type?: string,      // 'yearly' | 'monthly' | 'weekly'
  created_at: string,            // Timestamp der Erstellung
  updated_at: string,            // Timestamp der letzten Änderung
  images?: Array<{               // Verknüpfte Bilder
    filename: string,
    path: string
  }>
}
```

### Task
```javascript
{
  id: number,                    // Auto-increment ID
  title: string,                 // Titel der Aufgabe
  description?: string,          // Optionale Beschreibung
  status: 'todo' | 'in-progress' | 'done',  // Ampel-Status
  project_id: number,            // Verknüpftes Projekt (FK)
  due_date?: string,             // Fälligkeitsdatum (ISO 8601)
  result?: string,               // Ergebnis/Lösung
  created_at: string,            // Timestamp der Erstellung
  updated_at: string,            // Timestamp der letzten Änderung
  image_filenames?: string,      // Komma-separierte Dateinamen
  image_paths?: string,          // Komma-separierte Pfade
  images?: Array<{               // Geparste Bilder
    filename: string,
    path: string
  }>
}
```

### Project
```javascript
{
  id: number,                    // Auto-increment ID
  title: string,                 // Titel des Projekts
  description?: string,          // Optionale Beschreibung
  status: 'todo' | 'in-progress' | 'done',  // Status
  priority: 'low' | 'medium' | 'high',      // Priorität
  linked_event_id?: number,      // Verknüpftes Event (FK)
  due_date?: string,             // Fälligkeitsdatum (ISO 8601)
  color?: string,                // Farbe (Hex-Code)
  created_at: string,            // Timestamp der Erstellung
  updated_at: string             // Timestamp der letzten Änderung
}
```

### Note
```javascript
{
  id: number,                    // Auto-increment ID
  title: string,                 // Titel der Notiz
  content: string,               // Inhalt/Text
  category?: string,             // Kategorie (default: 'allgemein')
  priority: number,              // Priorität 1-5
  is_favorite: 0 | 1,           // Favorit (Boolean als Integer)
  is_private: 0 | 1,            // Privat (Boolean als Integer)
  tags?: string,                 // Komma-separierte Tags
  image_path?: string,           // Pfad zu einem Bild
  created_at: string,            // Timestamp der Erstellung
  updated_at: string             // Timestamp der letzten Änderung
}
```

### Image
```javascript
{
  id: number,                    // Auto-increment ID
  filename: string,              // Generierter Dateiname
  original_name: string,         // Original Dateiname
  path: string,                  // Relativer Pfad (/uploads/...)
  size: number,                  // Größe in Bytes
  mime_type: string,             // MIME Type (z.B. image/jpeg)
  description?: string,          // Optionale Beschreibung
  created_at: string             // Timestamp des Uploads
}
```

---

## 📅 Events API

### GET `/api/events`
Alle Events mit verknüpften Bildern abrufen.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Weihnachten",
    "description": "Familienfeier",
    "date": "2025-12-24",
    "end_date": null,
    "is_recurring": 1,
    "recurrence_type": "yearly",
    "created_at": "2025-10-01T10:00:00.000Z",
    "updated_at": "2025-10-01T10:00:00.000Z",
    "images": [
      {
        "filename": "image-1234567890-123456789.jpg",
        "path": "/uploads/image-1234567890-123456789.jpg"
      }
    ]
  }
]
```

### GET `/api/events/:id`
Einzelnes Event abrufen.

**URL Parameter:**
- `id` (number) - Event ID

**Response:** Einzelnes Event-Objekt (siehe Datenmodell)

### POST `/api/events`
Neues Event erstellen.

**Request Body:**
```json
{
  "title": "Silvester 2025",
  "description": "Party bei Freunden",
  "date": "2025-12-31",
  "end_date": null,
  "is_recurring": 1,
  "recurrence_type": "yearly"
}
```

**Response:** Erstelltes Event mit ID

### PUT `/api/events/:id`
Event aktualisieren.

**URL Parameter:**
- `id` (number) - Event ID

**Request Body:** Teilweise oder vollständige Event-Daten

**Response:** `{ message: "Event erfolgreich aktualisiert" }`

### DELETE `/api/events/:id`
Event und zugehörige Bilder löschen.

**URL Parameter:**
- `id` (number) - Event ID

**Response:** `{ message: "Event und zugehörige Daten erfolgreich gelöscht" }`

---

## ✅ Tasks API

### GET `/api/tasks`
Alle Tasks mit Bildern abrufen.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Auto mieten",
    "description": "Mietwagen für Weihnachtsreise",
    "status": "todo",
    "project_id": 1,
    "due_date": "2025-12-20",
    "result": null,
    "created_at": "2025-11-01T10:00:00.000Z",
    "updated_at": "2025-11-01T10:00:00.000Z",
    "images": [
      {
        "filename": "image-1762154716286-515820449.jpeg",
        "path": "/uploads/image-1762154716286-515820449.jpeg"
      }
    ]
  }
]
```

### POST `/api/tasks`
Neue Task erstellen.

**Request Body:**
```json
{
  "title": "Geschenke kaufen",
  "description": "Weihnachtsgeschenke besorgen",
  "status": "todo",
  "project_id": 1,
  "due_date": "2025-12-15",
  "result": ""
}
```

**Response:** `{ id: <task_id>, message: "Task erfolgreich erstellt" }`

### PUT `/api/tasks/:id`
Task aktualisieren (inkl. Status-Wechsel).

**URL Parameter:**
- `id` (number) - Task ID

**Request Body:**
```json
{
  "status": "in-progress",
  "result": "Angebote verglichen"
}
```

**Response:** `{ message: "Task erfolgreich aktualisiert" }`

### DELETE `/api/tasks/:id`
Task löschen.

**URL Parameter:**
- `id` (number) - Task ID

**Response:** `{ message: "Task erfolgreich gelöscht" }`

### POST `/api/tasks/:id/images`
Bild zu Task hochladen.

**URL Parameter:**
- `id` (number) - Task ID

**Request:** `multipart/form-data` mit Feld `image`

**Limits:**
- Max. Dateigröße: 50MB
- Erlaubte Typen: `image/*`
- 1 Bild pro Request

**Response:**
```json
{
  "message": "Bild erfolgreich hochgeladen",
  "image": {
    "filename": "image-1762157373522-121586760.jpeg",
    "path": "/uploads/image-1762157373522-121586760.jpeg"
  }
}
```

### DELETE `/api/tasks/:id/images/:filename`
Bild von Task entfernen.

**URL Parameter:**
- `id` (number) - Task ID
- `filename` (string) - Dateiname des zu löschenden Bildes

**Response:** `{ message: "Bild erfolgreich gelöscht" }`

---

## 📁 Projects API

### GET `/api/projects`
Alle Projekte abrufen.

**Response:**
```json
[
  {
    "id": 1,
    "title": "Weihnachten",
    "description": "Planung für Weihnachtsfeier",
    "status": "in-progress",
    "priority": "high",
    "linked_event_id": 1,
    "due_date": "2025-12-24",
    "color": "#dc2626",
    "created_at": "2025-10-15T10:00:00.000Z",
    "updated_at": "2025-11-01T10:00:00.000Z"
  }
]
```

### POST `/api/projects`
Neues Projekt erstellen.

**Request Body:**
```json
{
  "title": "Sommerurlaub 2026",
  "description": "Planung Italienreise",
  "status": "todo",
  "priority": "medium",
  "linked_event_id": null,
  "due_date": "2026-07-01",
  "color": "#f59e0b"
}
```

**Response:** `{ id: <project_id>, message: "Projekt erfolgreich erstellt" }`

### PUT `/api/projects/:id`
Projekt aktualisieren.

**URL Parameter:**
- `id` (number) - Project ID

**Request Body:** Teilweise oder vollständige Projekt-Daten

**Response:** `{ message: "Projekt erfolgreich aktualisiert" }`

### DELETE `/api/projects/:id`
Projekt löschen.

**URL Parameter:**
- `id` (number) - Project ID

**Response:** `{ message: "Projekt erfolgreich gelöscht" }`

**Hinweis:** Zugehörige Tasks werden NICHT automatisch gelöscht!

---

## 📝 Notes API

### GET `/api/notes`
Alle Notizen abrufen (sortiert nach `updated_at` DESC).

**Response:**
```json
[
  {
    "id": 1,
    "title": "Geschenkideen",
    "content": "- Buch über Italien\n- Kochkurs-Gutschein",
    "category": "weihnachten",
    "priority": 3,
    "is_favorite": 1,
    "is_private": 0,
    "tags": "geschenke,ideen,weihnachten",
    "image_path": "/uploads/note-image-123.jpg",
    "created_at": "2025-11-01T14:00:00.000Z",
    "updated_at": "2025-11-02T10:30:00.000Z"
  }
]
```

### GET `/api/notes/:id`
Einzelne Notiz abrufen.

**URL Parameter:**
- `id` (number) - Note ID

**Response:** Einzelnes Note-Objekt (siehe Datenmodell)

### POST `/api/notes`
Neue Notiz erstellen (mit optionalem Bild).

**Request:** `multipart/form-data`

**Fields:**
- `title` (string) - Titel
- `content` (string) - Inhalt
- `category` (string, optional) - Kategorie
- `priority` (number, optional) - 1-5
- `is_favorite` (number, optional) - 0 oder 1
- `is_private` (number, optional) - 0 oder 1
- `tags` (string, optional) - Komma-separiert
- `image` (file, optional) - Bilddatei

**Response:** `{ id: <note_id>, message: "Notiz erfolgreich erstellt" }`

### PUT `/api/notes/:id`
Notiz aktualisieren (mit optionalem neuen Bild).

**URL Parameter:**
- `id` (number) - Note ID

**Request:** `multipart/form-data` (wie bei POST)

**Response:** `{ message: "Notiz erfolgreich aktualisiert" }`

**Hinweis:** Neues Bild überschreibt altes Bild (altes wird gelöscht).

### DELETE `/api/notes/:id`
Notiz und zugehöriges Bild löschen.

**URL Parameter:**
- `id` (number) - Note ID

**Response:** `{ message: "Notiz erfolgreich gelöscht" }`

---

## 🖼️ Images API

### POST `/api/upload`
Bild hochladen (Legacy - für Event-Bilder).

**Request:** `multipart/form-data` mit Feld `image`

**Response:**
```json
{
  "message": "Bild erfolgreich hochgeladen",
  "imageId": 42,
  "path": "/uploads/image-1234567890-123456789.jpg"
}
```

### POST `/api/upload-hero`
Hero-Image (Hintergrundbild Startseite) hochladen.

**Request:** `multipart/form-data` mit Feld `heroImage`

**Limits:**
- Max. Dateigröße: 10MB
- Erlaubte Typen: `image/*`

**Response:**
```json
{
  "message": "Hero Bild erfolgreich hochgeladen",
  "imageUrl": "/uploads/hero-1234567890-123456789.jpg"
}
```

### GET `/api/images`
Alle hochgeladenen Bilder abrufen.

**Response:**
```json
[
  {
    "id": 1,
    "filename": "image-1234567890-123456789.jpg",
    "original_name": "weihnachten.jpg",
    "path": "/uploads/image-1234567890-123456789.jpg",
    "size": 245632,
    "mime_type": "image/jpeg",
    "description": null,
    "created_at": "2025-11-01T10:00:00.000Z"
  }
]
```

### POST `/api/events/:eventId/images/:imageId`
Bild mit Event verknüpfen.

**URL Parameter:**
- `eventId` (number) - Event ID
- `imageId` (number) - Image ID

**Response:** `{ message: "Bild erfolgreich mit Event verknüpft" }`

### GET `/uploads/:filename`
Statischer Zugriff auf hochgeladene Bilder.

**URL Parameter:**
- `filename` (string) - Dateiname

**Response:** Bilddatei (Content-Type wird automatisch gesetzt)

---

## 👥 Relationships API

### GET `/api/relationships`
Alle Beziehungen abrufen (derzeit ungenutzt).

**Response:** Array von Relationship-Objekten

### POST `/api/relationships`
Neue Beziehung erstellen.

**Request Body:**
```json
{
  "person1_id": 1,
  "person2_id": 2,
  "relationship_type": "friends"
}
```

**Response:** `{ id: <relationship_id>, message: "Beziehung erfolgreich erstellt" }`

**Hinweis:** Diese API ist im Frontend derzeit nicht implementiert.

---

## 👶 Baby API

### Datenmodelle

#### BabySavings
```javascript
{
  id: number,                    // Auto-increment ID
  amount: number,                // Aktueller Sparstand (decimal)
  target: number,                // Sparziel (decimal, default: 5000)
  created_at: string,            // Timestamp der Erstellung
  updated_at: string             // Timestamp der letzten Änderung
}
```

#### BabyItem
```javascript
{
  id: number,                    // Auto-increment ID
  title: string,                 // Artikel-Name
  notes?: string,                // Notizen/Details
  cost: number,                  // Kosten (decimal)
  image_path?: string,           // Pfad zum Bild
  shop_link?: string,            // Link zum Shop
  created_at: string,            // Timestamp der Erstellung
  updated_at: string             // Timestamp der letzten Änderung
}
```

### GET `/api/baby/savings`
Aktuellen Sparstand abrufen.

**Response:**
```json
{
  "id": 1,
  "amount": 1250.50,
  "target": 5000.00,
  "created_at": "2025-11-03T20:00:00.000Z",
  "updated_at": "2025-11-03T21:30:00.000Z"
}
```

### POST `/api/baby/savings/add`
Geld zur Rücklage hinzufügen.

**Request Body:**
```json
{
  "amount": 100.00
}
```

**Response:**
```json
{
  "id": 1,
  "amount": 1350.50,
  "target": 5000.00,
  "added": 100.00
}
```

**Validation:**
- `amount` muss eine positive Zahl sein

### PUT `/api/baby/savings`
Sparstand oder Ziel direkt setzen.

**Request Body:**
```json
{
  "amount": 2000.00,
  "target": 6000.00
}
```

**Response:**
```json
{
  "id": 1,
  "amount": 2000.00,
  "target": 6000.00
}
```

**Hinweis:** Beide Felder sind optional. Nicht angegebene Felder bleiben unverändert.

### GET `/api/baby/items`
Alle Baby-Artikel abrufen.

**Response:** Array von BabyItem-Objekten
```json
[
  {
    "id": 1,
    "title": "Kinderwagen",
    "notes": "3-in-1 System, grau",
    "cost": 599.99,
    "image_path": "/uploads/image-123456789.jpg",
    "shop_link": "https://shop.de/kinderwagen",
    "created_at": "2025-11-03T20:00:00.000Z",
    "updated_at": "2025-11-03T20:00:00.000Z"
  }
]
```

### POST `/api/baby/items`
Neuen Baby-Artikel erstellen.

**Request:** `multipart/form-data`
- `title` (required): Artikel-Name
- `notes` (optional): Notizen/Details
- `cost` (optional, default: 0): Kosten
- `shop_link` (optional): Link zum Shop
- `image` (optional): Bilddatei

**Response:**
```json
{
  "id": 2,
  "title": "Wickeltisch",
  "notes": "Mit Regal, weiß",
  "cost": 149.99,
  "image_path": "/uploads/image-987654321.jpg",
  "shop_link": "https://shop.de/wickeltisch"
}
```

**Validation:**
- `title` ist erforderlich
- Bilder: max. 50MB, nur `image/*` Dateitypen

### PUT `/api/baby/items/:id`
Baby-Artikel aktualisieren.

**Request:** `multipart/form-data`
- `title` (required): Artikel-Name
- `notes` (optional): Notizen/Details
- `cost` (optional): Kosten
- `shop_link` (optional): Link zum Shop
- `image` (optional): Neue Bilddatei (ersetzt vorhandenes)

**Response:** Aktualisiertes BabyItem-Objekt

**Status Codes:**
- `200 OK` - Erfolgreich aktualisiert
- `404 Not Found` - Artikel existiert nicht

### DELETE `/api/baby/items/:id`
Baby-Artikel löschen.

**Response:**
```json
{
  "message": "Baby Item und zugehöriges Bild erfolgreich gelöscht"
}
```

**Status Codes:**
- `200 OK` - Erfolgreich gelöscht
- `404 Not Found` - Artikel existiert nicht

**Hinweis:** Verknüpfte Bilddateien werden automatisch vom Server gelöscht.

---

## 🏥 Health Check

### GET `/api/health`
Server-Status prüfen.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-03T16:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production"
}
```

**Status Codes:**
- `200 OK` - Server läuft normal

---

## 🔧 Technische Details

### Authentifizierung
Derzeit keine Authentifizierung implementiert. Alle Endpoints sind öffentlich zugänglich.

### CORS
CORS ist aktiviert für alle Origins.

### Dateiuploads
- **Multer** als Upload-Middleware
- Storage: `./backend/uploads/` (bind mount zu `./data/uploads/`)
- Dateinamen: `{fieldname}-{timestamp}-{random}.{ext}`
- Max. Upload-Größe:
  - Tasks/Events: 50MB
  - Hero-Images: 10MB
  - Notes: 50MB

### Datenbank
- **SQLite** (`./data/db/relationship_organizer.db`)
- Bind-Mount für Persistenz
- Container-Berechtigungen: `1001:1001`
- File-Permissions: `666` (DB), `775` (Verzeichnisse)

### Error Handling
Alle Endpoints geben bei Fehlern folgendes Format zurück:
```json
{
  "error": "Fehlerbeschreibung"
}
```

Status Codes:
- `200 OK` - Erfolg
- `201 Created` - Ressource erstellt
- `400 Bad Request` - Ungültige Anfrage
- `404 Not Found` - Ressource nicht gefunden
- `500 Internal Server Error` - Server-Fehler

---

## 📊 Datenbank-Schema

```sql
-- Events (Kalendereinträge)
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  end_date TEXT,
  is_recurring INTEGER DEFAULT 0,
  recurrence_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (Aufgaben im Planer)
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  project_id INTEGER,
  due_date TEXT,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  image_filenames TEXT,
  image_paths TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Projects (Projektmanagement)
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  linked_event_id INTEGER,
  due_date TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (linked_event_id) REFERENCES events(id)
);

-- Notes (Notizen)
CREATE TABLE notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'allgemein',
  priority INTEGER DEFAULT 1,
  is_favorite INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  tags TEXT,
  image_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Images (Bildverwaltung)
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER,
  mime_type TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Event-Image Verknüpfung (Many-to-Many)
CREATE TABLE event_images (
  event_id INTEGER,
  image_id INTEGER,
  PRIMARY KEY (event_id, image_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- Relationships (derzeit ungenutzt)
CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person1_id INTEGER,
  person2_id INTEGER,
  relationship_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 Deployment Workflow

### Lokale Entwicklung
```bash
# Backend starten
cd backend
npm install
node server.js

# Frontend starten (separates Terminal)
npm install
npm start
```

### Production Build & Deploy
```bash
# Frontend bauen
npm run build

# In Container kopieren
docker cp ./build/. borganizer-app:/app/build/
docker cp ./backend/server.js borganizer-app:/app/backend/server.js

# Container neu starten
docker compose restart borganizer
```

### Wichtige Befehle
```bash
# Permissions fixen (vor jedem Start)
./fix-permissions.sh
./start.sh  # Führt fix-permissions automatisch aus

# Safe Rebuild (mit Backup)
./safe-rebuild.sh

# Manuelles Backup
./quick-backup.sh

# Rollback
./rollback.sh
```

---

## 📝 Changelog

### Version 1.0 (03.11.2025)
- ✅ Baby Bereich mit vollständigem Backend implementiert
  - Baby Savings API (GET/POST/PUT)
  - Baby Items API (GET/POST/PUT/DELETE)
  - Bild-Upload für Baby-Artikel
  - Flip-Card Design mit Shop-Links
- ✅ Task-Bilder API hinzugefügt (`POST /api/tasks/:id/images`, `DELETE`)
- ✅ Flip-Card Animation für Tasks implementiert
- ✅ Projektname in Task-Karten auf Startseite
- ✅ Permanente Permissions-Lösung für Docker
- ✅ Multi-Day Events zeigen Enddatum

### Geplante Features
- 🔄 Authentifizierung & User-Management
- 🔄 Telegram-Benachrichtigungen für Tasks
- 🔄 Bild-Optimierung (Thumbnails, WebP-Konvertierung)
- 🔄 Volltext-Suche über alle Entitäten
- 🔄 Export/Import Funktionalität

---

**Dokumentation erstellt am:** 3. November 2025  
**Maintainer:** Andreas  
**Repository:** https://github.com/Ioadidaiz/Relationship_Organizer
