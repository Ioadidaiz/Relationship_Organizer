import React, { useState, useEffect } from 'react';
import './App.css';
import { apiService, CalendarEvent, Note } from './services/apiService';

function App() {
  const [activeSection, setActiveSection] = useState('startseite');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    type: 'anniversary', 
    description: '', 
    recurring: false,
    isMultiDay: false 
  });
  const [eventImages, setEventImages] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverConnected, setServerConnected] = useState(false);

  // Notizen States
  const [notes, setNotes] = useState<Note[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteConfirmNote, setDeleteConfirmNote] = useState<number | null>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    category: 'allgemein',
    priority: 1,
    is_favorite: false,
    is_private: false,
    tags: ''
  });
  const [noteImage, setNoteImage] = useState<File | null>(null);

  // Hero Image States
  const [heroImage, setHeroImage] = useState<File | null>(null);
  const [currentHeroImage, setCurrentHeroImage] = useState('/image1.jpg'); // Default hero image
  const [isUploadingHero, setIsUploadingHero] = useState(false);

  // Lade Events und Notizen beim Start
  useEffect(() => {
    loadEvents();
    loadNotes();
    checkServerConnection();
    loadCurrentHeroImage();
  }, []);

  // Scroll-Listener für Navigation Transparenz-Effekt
  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.querySelector('.top-navigation');
      const scrolled = window.scrollY > 50; // Ab 50px Scroll
      
      if (navbar) {
        if (scrolled) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    };

    // Event Listener hinzufügen
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup beim Unmounting
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Bild-URL optimieren (für bereits hochgeladene Bilder)
  const getOptimizedImageUrl = (originalUrl: string): string => {
    // Falls das Backend eine Thumbnail-API hätte, würden wir sie hier nutzen
    // Vorerst geben wir die Original-URL zurück, da der Browser mit CSS object-fit handled
    return originalUrl;
  };

  // Fallback-Bild mit konsistenter Größe
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>, fallbackSrc: string = '/image1.jpg') => {
    const target = e.target as HTMLImageElement;
    if (target.src !== fallbackSrc) {
      target.src = fallbackSrc;
    }
  };

  // Hero Image Upload und Skalierung
  const handleHeroImageUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploadingHero(true);
    try {
      // Bild für Hero-Format optimieren (1920x480 für Desktop, responsive für Mobile)
      const optimizedImage = await optimizeHeroImage(file);
      
      // FormData für Upload erstellen
      const formData = new FormData();
      
      // Blob aus Canvas DataURL erstellen
      const response = await fetch(optimizedImage);
      const blob = await response.blob();
      formData.append('heroImage', blob, `hero-${Date.now()}.jpg`);
      
      // Upload zum Backend
      const uploadResponse = await fetch('http://localhost:5000/api/upload-hero', {
        method: 'POST',
        body: formData
      });
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        setCurrentHeroImage(result.imagePath);
        setHeroImage(null);
        // Seite neu laden um das neue Hero Image anzuzeigen
        window.location.reload();
      } else {
        throw new Error('Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Hero Image Upload Error:', error);
      setError('Hero Image Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploadingHero(false);
    }
  };

  // Hero Image für optimales Format skalieren
  const optimizeHeroImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Hero Image Dimensionen: 1920x480 (Desktop-optimiert)
        const targetWidth = 1920;
        const targetHeight = 480;
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        if (!ctx) {
          reject(new Error('Canvas context nicht verfügbar'));
          return;
        }
        
        // Bild proportional skalieren und zentrieren
        const sourceRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (sourceRatio > targetRatio) {
          // Bild ist breiter -> Höhe anpassen
          drawHeight = targetHeight;
          drawWidth = drawHeight * sourceRatio;
          drawX = (targetWidth - drawWidth) / 2;
          drawY = 0;
        } else {
          // Bild ist höher -> Breite anpassen
          drawWidth = targetWidth;
          drawHeight = drawWidth / sourceRatio;
          drawX = 0;
          drawY = (targetHeight - drawHeight) / 2;
        }
        
        // Schwarzen Hintergrund für Letterboxing
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Bild zeichnen
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // Als JPEG mit hoher Qualität konvertieren
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      
      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Aktuelles Hero Image laden
  const loadCurrentHeroImage = () => {
    // Prüfe ob custom hero image existiert
    const heroImagePath = '/hero-image.jpg';
    const img = new Image();
    img.onload = () => {
      setCurrentHeroImage(heroImagePath);
    };
    img.onerror = () => {
      // Fallback zum default image
      setCurrentHeroImage('/panorama-rio.png');
    };
    img.src = heroImagePath;
  };

  const checkServerConnection = async () => {
    try {
      const connected = await apiService.isServerRunning();
      setServerConnected(connected);
      if (!connected) {
        setError('Backend-Server ist nicht erreichbar. Bitte starten Sie den Server mit: npm run backend');
      } else {
        setError(null);
      }
    } catch (err) {
      setServerConnected(false);
      setError('Fehler bei der Verbindung zum Server.');
    }
  };

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const dbEvents = await apiService.getEvents();
      setEvents(dbEvents);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Events:', err);
      // Fallback: Verwende lokale Events wenn Server nicht verfügbar
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const dbNotes = await apiService.getNotes();
      setNotes(dbNotes);
    } catch (err) {
      console.error('Fehler beim Laden der Notizen:', err);
      setNotes([]);
    }
  };

  // Hole alle anstehenden Termine (horizontal scrollbar)
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = events
      .filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      // Alle Events anzeigen - horizontal scrollbar
      .map(event => {
        console.log('Event:', event.title, 'Images:', event.images); // Debug-Output
        return {
          ...event,
          daysUntil: Math.ceil((new Date(event.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          displayImage: event.images && event.images.length > 0 
            ? `http://localhost:5000/uploads/${event.images[0].filename}` // Vollständiger Backend-Pfad
            : `/image${Math.floor(Math.random() * 4) + 1}.jpg` // Zufälliges Standardbild
        };
      });
    
    console.log('Upcoming events:', upcomingEvents); // Debug-Output
    return upcomingEvents;
  };

  // Formatiere die Tage bis zum Event
  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Heute';
    if (days === 1) return 'Morgen';
    if (days < 7) return `In ${days} Tagen`;
    if (days < 14) return `In ${Math.round(days / 7)} Woche`;
    if (days < 30) return `In ${Math.round(days / 7)} Wochen`;
    return `In ${Math.round(days / 30)} Monat(en)`;
  };

  // ===== NOTIZEN HANDLER =====

  const handleEditNote = (note: Note) => {
    console.log('Edit note clicked:', note.id);
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      category: note.category || 'allgemein',
      priority: note.priority || 1,
      is_favorite: note.is_favorite || false,
      is_private: (note as any).is_private || false,
      tags: note.tags || ''
    });
    setNoteImage(null); // Reset image for editing
    setShowNoteModal(true);
  };

  // Bild-Komprimierung vor Upload (kleinere Vorschaubilder)
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Kleine Vorschaubilder - maximale Größe für Karten
        const maxWidth = 300;
        const maxHeight = 300;
        let { width, height } = img;
        
        // Proportional skalieren
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Bild zeichnen und stark komprimieren für kleine Dateigröße
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback bei Fehlern
          }
        }, 'image/jpeg', 0.6); // 60% Qualität für kleinere Dateien
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSaveNote = async () => {
    try {
      let imageToUpload = noteImage;
      
      // Komprimiere ALLE Bilder automatisch für kleinere Vorschaubilder
      if (noteImage) {
        setIsLoading(true);
        imageToUpload = await compressImage(noteImage);
        console.log(`Bild komprimiert: ${(noteImage.size / 1024).toFixed(1)}KB → ${(imageToUpload.size / 1024).toFixed(1)}KB`);
      }
      
      if (editingNote) {
        await apiService.updateNote(editingNote.id!, newNote, imageToUpload || undefined);
      } else {
        await apiService.createNote(newNote, imageToUpload || undefined);
      }
      await loadNotes();
      setShowNoteModal(false);
      setNoteImage(null); // Reset image
      setIsLoading(false);
    } catch (err) {
      console.error('Fehler beim Speichern der Notiz:', err);
      setError('Fehler beim Speichern der Notiz');
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    console.log('Delete note clicked:', id);
    setDeleteConfirmNote(id);
  };

  const confirmDeleteNote = async (id: number) => {
    try {
      setIsLoading(true);
      await apiService.deleteNote(id);
      await loadNotes();
      setDeleteConfirmNote(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Fehler beim Löschen der Notiz:', err);
      setError('Fehler beim Löschen der Notiz');
      setDeleteConfirmNote(null);
      setIsLoading(false);
    }
  };

  const cancelDeleteNote = () => {
    setDeleteConfirmNote(null);
  };

  const categories = [
    'alle',
    'allgemein',
    'essen',
    'geschenke',
    'hobbies',
    'vorlieben',
    'abneigungen',
    'wünsche',
    'erinnerungen',
    'besonderes'
  ];

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false, isMultiDay: false });
    setSelectedEndDate('');
    setEventImages([]);
    setShowEventModal(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setSelectedEndDate(event.end_date || '');
    setNewEvent({ 
      title: event.title, 
      type: 'anniversary',
      description: event.description || '',
      recurring: event.is_recurring || false,
      isMultiDay: !!(event.end_date && event.end_date !== event.date)
    });
    setEventImages([]);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (!serverConnected) {
      // Fallback: Lokale Löschung
      setEvents(events.filter(event => event.id !== eventId));
      return;
    }
    
    try {
      await apiService.deleteEvent(eventId);
      await loadEvents();
    } catch (err) {
      console.error('Fehler beim Löschen des Events:', err);
      setError('Fehler beim Löschen des Events.');
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !selectedDate) return;
    
    if (!serverConnected) {
      // Fallback: Lokales Speichern
      if (editingEvent) {
        setEvents(events.map(event => 
          event.id === editingEvent.id 
            ? { ...event, date: selectedDate, title: newEvent.title, description: newEvent.description, is_recurring: newEvent.recurring }
            : event
        ));
      } else {
        const event = {
          id: events.length + 1,
          date: selectedDate,
          title: newEvent.title,
          type: newEvent.type as 'birthday' | 'date' | 'reminder' | 'other' | 'anniversary',
          description: newEvent.description,
          created_at: new Date().toISOString(),
          is_recurring: newEvent.recurring,
          recurrence_type: newEvent.recurring ? 'yearly' : undefined
        };
        setEvents([...events, event]);
      }
      setShowEventModal(false);
      setEditingEvent(null);
      setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false, isMultiDay: false });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Erst das Event erstellen/aktualisieren
      const eventData = {
        title: newEvent.title,
        type: newEvent.type as 'birthday' | 'date' | 'reminder' | 'other' | 'anniversary',
        description: newEvent.description,
        date: selectedDate,
        end_date: newEvent.isMultiDay ? selectedEndDate : undefined,
        is_recurring: newEvent.recurring,
        recurrence_type: newEvent.recurring ? 'yearly' : undefined
      };

      let savedEventId: number;
      
      if (editingEvent && editingEvent.id) {
        await apiService.updateEvent(editingEvent.id, eventData);
        savedEventId = editingEvent.id;
      } else {
        const savedEvent = await apiService.createEvent(eventData);
        savedEventId = savedEvent.id!;
      }

      // Dann Bilder hochladen und mit Event verknüpfen
      for (const imageFile of eventImages) {
        try {
          const uploadedImage = await apiService.uploadImage(imageFile, `Image for event: ${newEvent.title}`);
          await apiService.addImageToEvent(savedEventId, uploadedImage.id!);
        } catch (imgError) {
          console.error('Fehler beim Hochladen des Bildes:', imgError);
        }
      }

      await loadEvents();
      setShowEventModal(false);
      setEditingEvent(null);
      setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false, isMultiDay: false });
      setSelectedEndDate('');
      setEventImages([]);
    } catch (err) {
      console.error('Fehler beim Speichern des Events:', err);
      setError('Fehler beim Speichern des Events.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag & Drop für Bilder
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      setEventImages(prev => [...prev, ...imageFiles]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      setEventImages(prev => [...prev, ...imageFiles]);
    }
  };

  const removeImage = (index: number) => {
    setEventImages(prev => prev.filter((_, i) => i !== index));
  };

  // Navigation zwischen Monaten
  const navigateMonth = (direction: number) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Hilfsfunktion für wiederkehrende Ereignisse
  const getEventsForDate = (date: string) => {
    return events.filter(event => {
      // Für normale Events oder Start-/Enddatum
      if (event.date === date) return true;
      
      // Für mehrtägige Events - prüfe ob das Datum im Bereich liegt
      if (event.end_date && event.end_date !== event.date) {
        const eventStart = new Date(event.date);
        const eventEnd = new Date(event.end_date);
        const checkDate = new Date(date);
        return checkDate >= eventStart && checkDate <= eventEnd;
      }
      
      // Für wiederkehrende Ereignisse
      if (event.is_recurring) {
        const eventDate = new Date(event.date);
        const checkDate = new Date(date);
        
        return eventDate.getMonth() === checkDate.getMonth() && 
               eventDate.getDate() === checkDate.getDate();
      }
      
      return false;
    });
  };

  // Kalender-Tage generieren
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Montag = 0
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    const todayDate = today.getDate();
    
    const days = [];
    
    // Leere Tage am Anfang
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="day empty"></div>
      );
    }
    
    // Tage des Monats
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayEvents = getEventsForDate(dateString);
      const isToday = isCurrentMonth && day === todayDate;
      
      let dayClass = 'day';
      if (isToday) dayClass += ' today';
      if (dayEvents.length > 0) dayClass += ` has-event anniversary`;
      
      days.push(
        <div 
          key={day}
          className={dayClass}
          onClick={() => handleDayClick(dateString)}
        >
          {day}
          {dayEvents.map((event, index) => (
            <div key={index} className="event-dot" onClick={(e) => e.stopPropagation()}>
              <span className="event-title-dot">{event.title}{event.is_recurring && " 🔄"}</span>
              <div className="event-actions-dropdown">
                <button 
                  className="edit-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(event);
                  }}
                  title="Bearbeiten"
                >
                  ✏️
                </button>
                <button 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (event.id) handleDeleteEvent(event.id);
                  }}
                  title="Löschen"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    return days;
  };

  const menuItems = [
    { id: 'startseite', label: 'Startseite', icon: '🏠' },
    { id: 'kalender', label: 'Kalender', icon: '📅' },
    { id: 'planer', label: 'Planer', icon: '📋' },
    { id: 'stories', label: 'Stories', icon: '📖' },
    { id: 'notizen', label: 'Notizen', icon: '📝' },
    { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
  ];

  const renderContent = () => {
    switch(activeSection) {
      case 'kalender':
        return (
          <div className="calendar-view">
            <div className="calendar-header">
              <div className="status-indicators">
                <div className={`server-status ${serverConnected ? 'connected' : 'disconnected'}`}>
                  <span className="status-dot"></span>
                  {serverConnected ? 'Datenbank verbunden' : 'Offline-Modus'}
                </div>
                {isLoading && <div className="loading-indicator">💾 Speichert...</div>}
              </div>
              <button className="add-event-btn" onClick={() => setShowEventModal(true)}>
                + Ereignis hinzufügen
              </button>
            </div>
            
            {error && (
              <div className="error-banner">
                ⚠️ {error}
                <button onClick={checkServerConnection} className="retry-btn">Erneut versuchen</button>
              </div>
            )}
            
            <div className="calendar-container">
              <div className="calendar-main">
                <div className="calendar-grid">
                  <div className="calendar-month">
                    <div className="month-navigation">
                      <button className="nav-btn" onClick={() => navigateMonth(-1)}>‹</button>
                      <h2>
                        {new Date(currentYear, currentMonth).toLocaleDateString('de-DE', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </h2>
                      <button className="nav-btn" onClick={() => navigateMonth(1)}>›</button>
                    </div>
                    <div className="weekdays">
                      <div className="weekday">Mo</div>
                      <div className="weekday">Di</div>
                      <div className="weekday">Mi</div>
                      <div className="weekday">Do</div>
                      <div className="weekday">Fr</div>
                      <div className="weekday">Sa</div>
                      <div className="weekday">So</div>
                    </div>
                    <div className="days-grid">
                      {generateCalendarDays()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Modal */}
            {showEventModal && (
              <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
                <div className="event-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>{editingEvent ? 'Ereignis bearbeiten' : 'Neues Ereignis hinzufügen'}</h3>
                  <div className="form-group">
                    <label>Datum</label>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={newEvent.isMultiDay}
                        onChange={(e) => setNewEvent({...newEvent, isMultiDay: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      Mehrtägiges Event
                    </label>
                  </div>
                  
                  {newEvent.isMultiDay && (
                    <div className="form-group">
                      <label>Enddatum</label>
                      <input 
                        type="date" 
                        value={selectedEndDate} 
                        onChange={(e) => setSelectedEndDate(e.target.value)}
                        min={selectedDate}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Titel</label>
                    <input 
                      type="text" 
                      placeholder="z.B. Jahrestag, Geburtstag..." 
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Typ</label>
                    <select 
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                    >
                      <option value="anniversary">Jahrestag</option>
                      <option value="birthday">Geburtstag</option>
                      <option value="holiday">Feiertag</option>
                      <option value="reminder">Erinnerung</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Beschreibung</label>
                    <textarea 
                      placeholder="Optionale Beschreibung..."
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={newEvent.recurring}
                        onChange={(e) => setNewEvent({...newEvent, recurring: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      Jährlich wiederholen (z.B. für Geburtstage, Jahrestage)
                    </label>
                  </div>
                  
                  <div className="form-group">
                    <label>Bilder hinzufügen</label>
                    <div 
                      className={`drag-drop-area ${isDragOver ? 'drag-over' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <div className="drag-drop-content">
                        <span className="drag-drop-icon">📁</span>
                        <p>Bilder hier hineinziehen oder klicken zum Auswählen</p>
                        <small>PNG, JPG, JPEG bis 10MB</small>
                      </div>
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageSelect}
                    />
                    
                    {eventImages.length > 0 && (
                      <div className="selected-images">
                        <h4>Ausgewählte Bilder:</h4>
                        <div className="image-preview-grid">
                          {eventImages.map((file, index) => (
                            <div key={index} className="image-preview-item">
                              <img 
                                src={URL.createObjectURL(file)} 
                                alt={file.name} 
                                className="preview-image"
                              />
                              <button 
                                className="remove-image-btn"
                                onClick={() => removeImage(index)}
                                type="button"
                              >
                                ✕
                              </button>
                              <span className="file-name">{file.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setShowEventModal(false)}>
                      Abbrechen
                    </button>
                    <button className="save-btn" onClick={handleSaveEvent}>
                      {editingEvent ? 'Aktualisieren' : 'Speichern'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'startseite':
        return (
          <div className="dashboard">            
            <div className="content-rails">
              <div className="rail">
                <h2>Anstehende Anlässe</h2>
                <div className="rail-items" id="upcoming-events">
                  {getUpcomingEvents().length > 0 ? (
                    getUpcomingEvents().map((event, index) => (
                      <div key={event.id || index} className="rail-card flip-card" onClick={() => handleEditEvent(event)}>
                        <div className="flip-card-inner">
                          {/* Vorderseite */}
                          <div className="flip-card-front">
                            <div className="card-image">
                              <img 
                                src={getOptimizedImageUrl(event.displayImage)} 
                                alt={event.title}
                                onError={(e) => handleImageError(e, '/image1.jpg')}
                                loading="lazy"
                                style={{
                                  imageRendering: 'auto',
                                  filter: 'brightness(1.05) contrast(1.02)'
                                }}
                              />
                            </div>
                            <div className="card-content">
                              <h4>{event.title}</h4>
                              <p>{formatDaysUntil(event.daysUntil)}</p>
                              <small>{new Date(event.date).toLocaleDateString('de-DE', { 
                                day: '2-digit', 
                                month: 'short',
                                year: 'numeric'
                              })}</small>
                            </div>
                          </div>
                          
                          {/* Rückseite */}
                          <div className="flip-card-back">
                            <div className="card-image">
                              <img 
                                src={getOptimizedImageUrl(event.displayImage)} 
                                alt={event.title}
                                onError={(e) => handleImageError(e, '/image1.jpg')}
                                loading="lazy"
                                style={{
                                  imageRendering: 'auto',
                                  filter: 'brightness(1.05) contrast(1.02)'
                                }}
                              />
                              <div className="image-overlay"></div>
                            </div>
                            <div className="card-content card-content-back">
                              <h4>{event.title}</h4>
                              <p className="event-description">
                                {event.description || 'Keine Beschreibung verfügbar'}
                              </p>
                              <div className="event-meta">
                                <small>{formatDaysUntil(event.daysUntil)}</small>
                                <small>{new Date(event.date).toLocaleDateString('de-DE', { 
                                  day: '2-digit', 
                                  month: 'short',
                                  year: 'numeric'
                                })}</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rail-card empty-state">
                      <div className="card-image">
                        <img src="/image1.jpg" alt="Keine Termine" />
                      </div>
                      <div className="card-content">
                        <h4>Keine anstehenden Termine</h4>
                        <p>Erstelle deinen ersten Termin im Kalender!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rail">
                <h2>Zuletzt hinzugefügt</h2>
                <div className="rail-items" id="latest-notes">
                  {notes.length > 0 ? (
                    notes
                      .sort((a, b) => new Date(b.updated_at || b.created_at!).getTime() - new Date(a.updated_at || a.created_at!).getTime())
                      // Alle Notizen anzeigen - horizontal scrollbar
                      .map((note, index) => (
                        <div key={note.id || index} className="rail-card">
                          <div className="card-image">
                            <img 
                              src={note.image_path ? getOptimizedImageUrl(`http://localhost:5000${note.image_path}`) : '/image3.jpg'} 
                              alt={note.title}
                              onError={(e) => handleImageError(e, '/image3.jpg')}
                              loading="lazy" // Lazy loading für bessere Performance
                              style={{
                                imageRendering: 'auto', // Bessere Bild-Qualität
                                filter: 'brightness(1.05) contrast(1.02)' // Leichte Verbesserung der Bildqualität
                              }}
                            />
                          </div>
                          <div className="card-content">
                            <h4>{note.title}</h4>
                            <p>{note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content}</p>
                            <small>{note.category ? (note.category.charAt(0).toUpperCase() + note.category.slice(1)) : 'Allgemein'}</small>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="rail-card empty-state">
                      <div className="card-image">
                        <img src="/image3.jpg" alt="Keine Notizen" />
                      </div>
                      <div className="card-content">
                        <h4>Noch keine Notizen</h4>
                        <p>Erstelle deine erste Notiz!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rail">
                <h2>Kleine Gesten (≤10 Min)</h2>
                <div className="rail-items" id="kleine-gesten">
                  <div className="rail-card">
                    <div className="card-image"></div>
                    <div className="card-content">
                      <h4>Lieblings-Snack</h4>
                      <p>5 min</p>
                    </div>
                  </div>
                  <div className="rail-card">
                    <div className="card-image"></div>
                    <div className="card-content">
                      <h4>Süße Nachricht</h4>
                      <p>2 min</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'notizen':
        const categories = ['essen', 'geschenke', 'hobbies', 'vorlieben', 'abneigungen', 'wünsche'];
        
        const getCategoryNotes = (category: string) => {
          return notes.filter(note => note.category === category);
        };

        const getCategoryImage = (category: string) => {
          const images: { [key: string]: string } = {
            'essen': '/essen.jpg',
            'geschenke': '/geschenke.jpg', 
            'hobbies': '/hobbies.jpg',
            'vorlieben': '/vorlieben.jpg',
            'abneigungen': '/abneigungen.jpg',
            'wünsche': '/wünsche.jpg'
          };
          return images[category] || '/image1.jpg';
        };

        const getNoteImage = (note: Note, category: string) => {
          // Verwende das spezifische Notiz-Bild falls vorhanden, sonst Kategorie-Bild
          if (note.image_path) {
            return `http://localhost:5000${note.image_path}`;
          }
          return getCategoryImage(category);
        };

        const getLatestNotes = (categoryNotes: Note[], count: number = 2) => {
          return categoryNotes
            .sort((a, b) => new Date(b.updated_at || b.created_at!).getTime() - new Date(a.updated_at || a.created_at!).getTime())
            .slice(0, count);
        };

        return (
          <div className="dashboard">
            <div className="hero-section">
              <h1>Meine Notizen</h1>
              <div className="hero-card">
                <h3>Persönliche Details über deine Partnerin</h3>
                <p>Sammle wichtige Informationen, um ihr noch mehr Freude zu bereiten!</p>
              </div>
            </div>
            
            <div className="content-rails">
              {categories.map(category => {
                const categoryNotes = getCategoryNotes(category);
                const latestNotes = getLatestNotes(categoryNotes);
                
                return (
                  <div key={category} className="rail">
                    <h2>
                      {category.charAt(0).toUpperCase() + category.slice(1)} 
                      <span className="notes-count">({categoryNotes.length})</span>
                    </h2>
                    <div className="rail-items" id={`category-${category}`}>
                      {/* Kategorie-Karte zum Hinzufügen */}
                      <div className="rail-card flip-card" onClick={() => {
                        setNewNote({
                          title: '',
                          content: '',
                          category: category,
                          priority: 1,
                          is_favorite: false,
                          is_private: false,
                          tags: ''
                        });
                        setEditingNote(null);
                        setShowNoteModal(true);
                      }}>
                        <div className="flip-card-inner">
                          <div className="flip-card-front">
                            <div className="card-image">
                              <img 
                                src={getCategoryImage(category)} 
                                alt={category}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/image1.jpg';
                                }}
                              />
                            </div>
                            <div className="card-content">
                              <h4>+ {category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                              <p>{categoryNotes.length === 0 ? 'Neue Notiz hinzufügen' : `${categoryNotes.length} ${categoryNotes.length === 1 ? 'Notiz' : 'Notizen'}`}</p>
                              <small>Klicken zum Hinzufügen</small>
                            </div>
                          </div>
                          <div className="flip-card-back">
                            <div className="card-image">
                              <img 
                                src={getCategoryImage(category)} 
                                alt={category}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/image1.jpg';
                                }}
                              />
                              <div className="image-overlay"></div>
                            </div>
                            <div className="card-content card-content-back">
                              <h4>+ Hinzufügen</h4>
                              <p className="event-description">
                                Neue {category} Notiz erstellen
                              </p>
                              <div className="event-meta">
                                <small>{categoryNotes.length} vorhanden</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Letzte Notizen dieser Kategorie */}
                      {latestNotes.map((note, index) => (
                        <div key={note.id} className="rail-card flip-card note-card-with-actions">
                          <div className="flip-card-inner">
                            <div className="flip-card-front">
                              <div className="card-image">
                                <img 
                                  src={getNoteImage(note, category)} 
                                  alt={note.title}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/image1.jpg';
                                  }}
                                />
                              </div>
                              <div className="card-content">
                                <h4>{note.title}</h4>
                                <p>{note.content.substring(0, 50)}{note.content.length > 50 ? '...' : ''}</p>
                                <small>
                                  {new Date(note.updated_at || note.created_at!).toLocaleDateString('de-DE', { 
                                    day: '2-digit', 
                                    month: 'short'
                                  })}
                                  {note.is_favorite && ' ⭐'}
                                </small>
                              </div>
                              {/* Action Buttons */}
                              <div className="card-actions">
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={(e) => {
                                    console.log('Edit button clicked for note:', note.id);
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleEditNote(note);
                                  }}
                                  title="Bearbeiten"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={(e) => {
                                    console.log('Delete button clicked for note:', note.id);
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteNote(note.id!);
                                  }}
                                  title="Löschen"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="flip-card-back">
                              <div className="card-image">
                                <img 
                                  src={getNoteImage(note, category)} 
                                  alt={note.title}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/image1.jpg';
                                  }}
                                />
                                <div className="image-overlay"></div>
                              </div>
                              <div className="card-content card-content-back">
                                <h4>{note.title}</h4>
                                <p className="event-description">
                                  {note.content}
                                </p>
                                <div className="event-meta">
                                  <small>
                                    {new Date(note.updated_at || note.created_at!).toLocaleDateString('de-DE', { 
                                      day: '2-digit', 
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </small>
                                  {note.tags && <small>Tags: {note.tags}</small>}
                                  {note.is_favorite && <small>⭐ Favorit</small>}
                                </div>
                              </div>
                              {/* Action Buttons auch auf Rückseite */}
                              <div className="card-actions card-actions-back">
                                <button 
                                  className="action-btn edit-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditNote(note);
                                  }}
                                  title="Bearbeiten"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="action-btn delete-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteNote(note.id!);
                                  }}
                                  title="Löschen"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* "Alle anzeigen" Karte falls mehr als 2 Notizen */}
                      {categoryNotes.length > 2 && (
                        <div className="rail-card show-all-card" onClick={() => {
                          // Hier könntest du zu einer Detail-Ansicht wechseln
                          console.log('Alle anzeigen für Kategorie:', category);
                        }}>
                          <div className="card-image">
                            <img 
                              src={getCategoryImage(category)} 
                              alt={`Alle ${category}`}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/image1.jpg';
                              }}
                            />
                          </div>
                          <div className="card-content">
                            <h4>Alle anzeigen</h4>
                            <p>{categoryNotes.length - 2} weitere {category} Notizen</p>
                            <small>Klicken für Details</small>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'einstellungen':
        return (
          <div className="settings-view">
            <div className="settings-header">
              <h1>⚙️ Einstellungen</h1>
              <p>Personalisiere deine Anwendung</p>
            </div>
            
            <div className="settings-content">
              <div className="settings-section">
                <div className="settings-card">
                  <div className="settings-card-header">
                    <h3>🖼️ Hero Image</h3>
                    <p>Ändere das Hintergrundbild der Startseite</p>
                  </div>
                  
                  <div className="hero-image-preview">
                    <img 
                      src={currentHeroImage}
                      alt="Current Hero"
                      className="current-hero-preview"
                      onError={(e) => handleImageError(e, '/hero-image.jpg')}
                    />
                    <div className="hero-image-overlay">
                      <span>Aktuelles Hero Image</span>
                    </div>
                  </div>
                  
                  <div className="hero-upload-section">
                    <div className="upload-instructions">
                      <h4>🎯 Optimale Bildgröße</h4>
                      <ul>
                        <li>Empfohlene Auflösung: 1920x480 Pixel</li>
                        <li>Unterstützte Formate: JPG, PNG, WebP</li>
                        <li>Das Bild wird automatisch optimiert und skaliert</li>
                        <li>Dunkle Bilder funktionieren am besten mit dem weißen Text</li>
                      </ul>
                    </div>
                    
                    <div className="hero-upload-controls">
                      <input
                        type="file"
                        id="hero-image-input"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setHeroImage(file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      
                      <label htmlFor="hero-image-input" className="upload-btn">
                        📁 Bild auswählen
                      </label>
                      
                      {heroImage && (
                        <div className="selected-file-info">
                          <span className="file-name">📎 {heroImage.name}</span>
                          <button 
                            className="upload-confirm-btn"
                            onClick={() => handleHeroImageUpload(heroImage)}
                            disabled={isUploadingHero}
                          >
                            {isUploadingHero ? '⏳ Wird hochgeladen...' : '✅ Hero Image ändern'}
                          </button>
                          <button 
                            className="upload-cancel-btn"
                            onClick={() => setHeroImage(null)}
                            disabled={isUploadingHero}
                          >
                            ❌ Abbrechen
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isUploadingHero && (
                      <div className="upload-progress">
                        <div className="progress-indicator">
                          <span className="spinner">⏳</span>
                          <span>Bild wird optimiert und hochgeladen...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="settings-card">
                  <div className="settings-card-header">
                    <h3>ℹ️ Anwendungsinformationen</h3>
                  </div>
                  <div className="app-info">
                    <div className="info-item">
                      <span className="info-label">Version:</span>
                      <span className="info-value">1.0.0</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Backend Status:</span>
                      <span className={`info-value ${serverConnected ? 'connected' : 'disconnected'}`}>
                        {serverConnected ? '✅ Verbunden' : '❌ Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="content">
            <h1>{menuItems.find(item => item.id === activeSection)?.label}</h1>
            <p>Bereich wird noch implementiert...</p>
          </div>
        );
    }
  };

  return (
    <div className="app">
      <div className="main-content">        
        {/* Top Navigation */}
        <div className="top-navigation">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`top-nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="top-nav-icon">{item.icon}</span>
              <span className="top-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
        
        <div className="content-area">
          {/* Panorama Header - nur für Startseite, am Anfang des Contents */}
          {activeSection === 'startseite' && (
            <div className="panorama-header-fullwidth">
              <div className="black-spacer-top"></div>
              <div className="panorama-container">
                <img 
                  src={currentHeroImage} 
                  alt="Hero Panorama" 
                  className="panorama-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== '/panorama-rio.png') {
                      target.src = '/panorama-rio.png';
                    }
                  }}
                />
              </div>
              <div className="black-spacer-bottom"></div>
            </div>
          )}
          {renderContent()}
        </div>

        {/* Notizen Modal */}
        {showNoteModal && (
          <div className="modal-overlay" onClick={() => setShowNoteModal(false)}>
            <div className="modal note-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingNote ? 'Notiz bearbeiten' : 'Neue Notiz erstellen'}</h2>
                <button className="close-btn" onClick={() => setShowNoteModal(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Titel</label>
                  <input
                    type="text"
                    value={newNote.title}
                    onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                    placeholder="Was möchtest du dir merken?"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Kategorie</label>
                    <select
                      value={newNote.category}
                      onChange={(e) => setNewNote({...newNote, category: e.target.value})}
                    >
                      {categories.slice(1).map(cat => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priorität</label>
                    <select
                      value={newNote.priority}
                      onChange={(e) => setNewNote({...newNote, priority: parseInt(e.target.value)})}
                    >
                      <option value={1}>Niedrig</option>
                      <option value={2}>Normal</option>
                      <option value={3}>Hoch</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Inhalt</label>
                  <textarea
                    value={newNote.content}
                    onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                    placeholder="Beschreibe hier was sie mag, was sie sich wünscht, etc..."
                    rows={5}
                  />
                </div>

                <div className="form-group">
                  <label>Tags (mit Komma getrennt)</label>
                  <input
                    type="text"
                    value={newNote.tags}
                    onChange={(e) => setNewNote({...newNote, tags: e.target.value})}
                    placeholder="z.B. schokolade, erdbeeren, überraschung"
                  />
                </div>

                <div className="form-group">
                  <label>Bild (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Datei-Größe prüfen (50MB Limit)
                        if (file.size > 50 * 1024 * 1024) {
                          setError('Datei ist zu groß. Maximal 50MB erlaubt.');
                          return;
                        }
                        setNoteImage(file);
                        setError(null); // Clear previous errors
                      } else {
                        setNoteImage(null);
                      }
                    }}
                  />
                  <small style={{ color: '#888', fontSize: '0.8rem' }}>
                    Unterstützte Formate: JPG, PNG, GIF. Max. 50MB.
                    {noteImage && ' (Wird automatisch zu 300x300px komprimiert)'}
                  </small>
                  {noteImage && (
                    <div className="image-preview">
                      <img 
                        src={URL.createObjectURL(noteImage)} 
                        alt="Vorschau" 
                        style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '10px' }}
                      />
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                        {noteImage.name} ({(noteImage.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    </div>
                  )}
                  {editingNote?.image_path && !noteImage && (
                    <div className="current-image">
                      <label>Aktuelles Bild:</label>
                      <img 
                        src={`http://localhost:5000${editingNote.image_path}`} 
                        alt="Aktuelles Bild" 
                        style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '10px' }}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newNote.is_favorite}
                      onChange={(e) => setNewNote({...newNote, is_favorite: e.target.checked})}
                    />
                    Als Favorit markieren ⭐
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowNoteModal(false)}>Abbrechen</button>
                <button className="primary" onClick={handleSaveNote}>
                  {editingNote ? 'Aktualisieren' : 'Speichern'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deleteConfirmNote && (
          <div className="modal-overlay">
            <div className="modal delete-modal">
              <div className="modal-header">
                <h3>Notiz löschen</h3>
              </div>
              <div className="modal-body">
                <p>Soll diese Notiz wirklich gelöscht werden?</p>
                <p className="delete-warning">Diese Aktion kann nicht rückgängig gemacht werden.</p>
              </div>
              <div className="modal-footer">
                <button onClick={cancelDeleteNote}>Abbrechen</button>
                <button className="danger" onClick={() => confirmDeleteNote(deleteConfirmNote)}>
                  Löschen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
