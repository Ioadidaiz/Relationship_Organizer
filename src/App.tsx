import React, { useState, useEffect } from 'react';
import './App.css';
import { apiService, CalendarEvent } from './services/apiService';

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

  // Lade Events beim Start
  useEffect(() => {
    loadEvents();
    checkServerConnection();
  }, []);

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

  // Hole die nächsten 5 anstehenden Termine
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events
      .filter(event => {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
      .map(event => ({
        ...event,
        daysUntil: Math.ceil((new Date(event.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        displayImage: event.images && event.images.length > 0 
          ? `/uploads/${event.images[0].filename}` 
          : `/image${Math.floor(Math.random() * 4) + 1}.jpg` // Zufälliges Standardbild
      }));
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
        const event: CalendarEvent = {
          id: events.length + 1,
          date: selectedDate,
          title: newEvent.title,
          description: newEvent.description,
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
      const eventData: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> = {
        title: newEvent.title,
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
    { id: 'bibliothek', label: 'Bibliothek', icon: '📚' },
    { id: 'kalender', label: 'Kalender', icon: '📅' },
    { id: 'planer', label: 'Planer', icon: '📋' },
    { id: 'favoriten', label: 'Favoriten', icon: '❤️' },
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
            <div className="hero-section">
              <h1>Für heute</h1>
              <div className="hero-card">
                <h3>Kleine Geste für heute</h3>
                <p>Zeit für eine liebevolle Überraschung - 10 Minuten reichen!</p>
              </div>
            </div>
            
            <div className="content-rails">
              <div className="rail">
                <h2>Anstehende Anlässe</h2>
                <div className="rail-items">
                  {getUpcomingEvents().length > 0 ? (
                    getUpcomingEvents().map((event, index) => (
                      <div key={event.id || index} className="rail-card" onClick={() => handleEditEvent(event)}>
                        <div className="card-image">
                          <img 
                            src={event.displayImage} 
                            alt={event.title}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/image1.jpg'; // Fallback wenn Bild nicht lädt
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
                <div className="rail-items">
                  <div className="rail-card">
                    <div className="card-image">
                      <img src="/image3.jpg" alt="Kaffee-Präferenz" />
                    </div>
                    <div className="card-content">
                      <h4>Kaffee-Präferenz</h4>
                      <p>Oat Flat White, nicht süß</p>
                    </div>
                  </div>
                  <div className="rail-card">
                    <div className="card-image">
                      <img src="/image4.jpg" alt="Film-Wunsch" />
                    </div>
                    <div className="card-content">
                      <h4>Film-Wunsch</h4>
                      <p>Möchte "Cozy Crime" Serie sehen</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rail">
                <h2>Kleine Gesten (≤10 Min)</h2>
                <div className="rail-items">
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
      <div className="sidebar">
        <div className="logo">
          <h2>Beziehungs Organizer</h2>
        </div>
        <nav className="navigation">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="main-content">
        <div className="top-bar">
          <div className="search-container">
            <input type="text" placeholder="Suchen..." className="search-input" />
          </div>
          <div className="quick-actions">
            <button className="quick-btn">+ Neu</button>
          </div>
        </div>
        
        <div className="content-area">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
