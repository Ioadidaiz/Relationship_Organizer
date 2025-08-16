import React, { useState } from 'react';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('startseite');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [events, setEvents] = useState<any[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', type: 'anniversary', description: '', recurring: false });

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false });
    setShowEventModal(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setNewEvent({ 
      title: event.title, 
      type: event.type, 
      description: event.description,
      recurring: event.recurring || false
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (eventId: number) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const handleSaveEvent = () => {
    if (newEvent.title && selectedDate) {
      if (editingEvent) {
        // Ereignis bearbeiten
        setEvents(events.map(event => 
          event.id === editingEvent.id 
            ? { ...event, date: selectedDate, title: newEvent.title, type: newEvent.type, description: newEvent.description, recurring: newEvent.recurring }
            : event
        ));
      } else {
        // Neues Ereignis hinzufügen
        const event = {
          id: events.length + 1,
          date: selectedDate,
          title: newEvent.title,
          type: newEvent.type,
          description: newEvent.description,
          recurring: newEvent.recurring
        };
        setEvents([...events, event]);
      }
      setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false });
      setSelectedDate('');
      setEditingEvent(null);
      setShowEventModal(false);
    }
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
      if (event.date === date) return true;
      
      // Für wiederkehrende Ereignisse
      if (event.recurring) {
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
      if (dayEvents.length > 0) dayClass += ` has-event ${dayEvents[0].type}`;
      
      days.push(
        <div 
          key={day}
          className={dayClass}
          onClick={() => handleDayClick(dateString)}
        >
          {day}
          {dayEvents.map((event, index) => (
            <div key={index} className="event-dot" onClick={(e) => e.stopPropagation()}>
              <span className="event-title-dot">{event.title}{event.recurring && " 🔄"}</span>
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
                    handleDeleteEvent(event.id);
                  }}
                  title="Löschen"
                >
                  �️
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
              <button className="add-event-btn" onClick={() => setShowEventModal(true)}>
                + Ereignis hinzufügen
              </button>
            </div>
            
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
                  <div className="rail-card">
                    <div className="card-image">
                      <img src="/image1.jpg" alt="Jahrestag" />
                    </div>
                    <div className="card-content">
                      <h4>Jahrestag</h4>
                      <p>In 12 Tagen</p>
                    </div>
                  </div>
                  <div className="rail-card">
                    <div className="card-image">
                      <img src="/image2.jpg" alt="Geburtstag" />
                    </div>
                    <div className="card-content">
                      <h4>Geburtstag</h4>
                      <p>In 3 Wochen</p>
                    </div>
                  </div>
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
