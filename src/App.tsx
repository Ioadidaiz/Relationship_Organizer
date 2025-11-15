import React, { useState, useEffect } from 'react';
import './App.css';
import { apiService, CalendarEvent, Note } from './services/apiService';
import Stories from './pages/Stories';

// Temporäres Project Interface direkt hier definiert
interface Project {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  linked_event_id?: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
  color?: string;
}

// Task Interface für Kanban-Board
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  project_id: number;
  due_date?: string;
  result?: string;
  created_at: string;
  updated_at: string;
  image_filenames?: string;
  image_paths?: string;
  images?: { filename: string; path: string }[];
}

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

  // Planer/Kanban States
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // States für editierbare Spaltennamen
  const [columnNames, setColumnNames] = useState({
    todo: 'Zu erledigen',
    'in-progress': 'In Bearbeitung',
    done: 'Erledigt'
  });
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [tempColumnName, setTempColumnName] = useState('');
  
  // Drag & Drop States für Tasks
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in-progress' | 'done',
    project_id: 0,
    due_date: '',
    result: '' // Für Antworten/Resultate bei Fragen
  });
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    linked_event_id: undefined as number | undefined,
    due_date: '',
    color: '#4a9eff'
  });

  // Baby States
  const [babySavings, setBabySavings] = useState(0); // Aktueller Sparstand
  const [babyTarget, setBabyTarget] = useState(5000); // Sparziel
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [moneyToAdd, setMoneyToAdd] = useState('');
  const [babyItems, setBabyItems] = useState<Array<{
    id: number;
    title: string;
    notes: string;
    cost: number;
    image_path?: string;
    shop_link?: string;
  }>>([]);
  const [showBabyItemModal, setShowBabyItemModal] = useState(false);
  const [editingBabyItem, setEditingBabyItem] = useState<{
    id: number;
    title: string;
    notes: string;
    cost: number;
    image_path?: string;
    shop_link?: string;
  } | null>(null);
  const [newBabyItem, setNewBabyItem] = useState({
    title: '',
    notes: '',
    cost: 0,
    shopLink: ''
  });
  const [babyItemImage, setBabyItemImage] = useState<File | null>(null);

  // Lade Events, Notizen und Baby-Daten beim Start
  useEffect(() => {
    loadEvents();
    loadNotes();
    loadProjects(); // Projekte laden
    loadTasks(); // Tasks laden
    loadBabyData(); // Baby-Daten laden
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

  // Featured Card Logic - macht erste sichtbare Karte in jeder Rail doppelt so breit
  useEffect(() => {
    const setupFeaturedCards = () => {
      const rails = document.querySelectorAll('.rail-items');
      
      const updateFeaturedCard = (railContainer: Element) => {
        const cards = railContainer.querySelectorAll('.rail-card');
        if (cards.length === 0) return;
        
        const containerRect = railContainer.getBoundingClientRect();
        const scrollLeft = railContainer.scrollLeft;
        const scrollWidth = railContainer.scrollWidth;
        const clientWidth = railContainer.clientWidth;
        
        // Prüfe ob am Ende der Rail
        const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
        
        let featuredCard: Element | null = null;
        let minDistance = Infinity;
        
        cards.forEach((card) => {
          const cardEl = card as HTMLElement;
          // Entferne featured class von allen Karten
          cardEl.classList.remove('featured');
          
          const cardRect = card.getBoundingClientRect();
          // Berechne die Position der Karte relativ zum Container-Anfang
          const cardLeftRelative = cardRect.left - containerRect.left;
          
          // Die Karte, die am nächsten zum linken Rand des Containers ist (aber noch sichtbar)
          // soll featured werden - aber nur wenn nicht am Ende
          if (!isAtEnd && cardLeftRelative >= -50 && cardLeftRelative < minDistance) {
            minDistance = cardLeftRelative;
            featuredCard = card;
          }
        });
        
        // Fallback: wenn keine Karte im sichtbaren Bereich oder am Anfang, nimm die erste
        if (!featuredCard && cards.length > 0 && !isAtEnd && scrollLeft < 50) {
          featuredCard = cards[0];
        }
        
        // Füge featured class zur gewählten Karte hinzu
        if (featuredCard) {
          (featuredCard as HTMLElement).classList.add('featured');
        }
      };
      
      // Initial setup für alle Rails
      rails.forEach((rail) => {
        updateFeaturedCard(rail);
        
        // Scroll listener für jede Rail mit throttling
        let scrollTimeout: NodeJS.Timeout;
        const handleRailScroll = () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => updateFeaturedCard(rail), 50);
        };
        
        rail.addEventListener('scroll', handleRailScroll);
        
        // Cleanup in einem data attribute speichern für später
        (rail as any)._featuredCardCleanup = () => {
          clearTimeout(scrollTimeout);
          rail.removeEventListener('scroll', handleRailScroll);
        };
      });
    };
    
    // Setup mit kleiner Verzögerung, damit DOM komplett geladen ist
    const timeoutId = setTimeout(setupFeaturedCards, 100);
    
    return () => {
      clearTimeout(timeoutId);
      // Cleanup für alle Rail scroll listeners
      const rails = document.querySelectorAll('.rail-items');
      rails.forEach((rail) => {
        if ((rail as any)._featuredCardCleanup) {
          (rail as any)._featuredCardCleanup();
        }
      });
    };
  }, [activeSection, events, tasks, projects]); // Re-run wenn sich content ändert

  // Scroll-Funktion für Rails (eine Kachel nach links/rechts)
  const scrollRail = (railId: string, direction: 'left' | 'right') => {
    const rail = document.getElementById(railId);
    if (!rail) return;

    const cardWidth = 280; // Breite einer normalen Karte
    const gap = 16; // Gap zwischen Karten
    const scrollAmount = cardWidth + gap;

    rail.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

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
      const uploadResponse = await fetch('/api/upload-hero', {
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

  const loadProjects = async () => {
    try {
      // Direkte API-Aufrufe anstatt apiService zu verwenden
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const dbProjects = await response.json();
      setProjects(dbProjects);
    } catch (err) {
      console.error('Fehler beim Laden der Projekte:', err);
      setProjects([]);
    }
  };

  // Hole nur Events (ohne Tasks)
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return events
      .filter(event => {
        const eventStartDate = new Date(event.date);
        eventStartDate.setHours(0, 0, 0, 0);
        
        // Für mehrtägige Events: prüfe ob heute zwischen Start- und Enddatum liegt
        if (event.end_date && event.end_date !== event.date) {
          const eventEndDate = new Date(event.end_date);
          eventEndDate.setHours(0, 0, 0, 0);
          // Event ist relevant wenn heute <= Enddatum ist (auch für laufende Events)
          return today <= eventEndDate;
        }
        
        // Für eintägige Events: prüfe ob Startdatum >= heute ist
        return eventStartDate >= today;
      })
      .map(event => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const eventStartDate = new Date(event.date);
        eventStartDate.setHours(0, 0, 0, 0);
        
        let daysUntil;
        // Für mehrtägige Events: berechne Tage bis zum Ende, wenn Event bereits läuft
        if (event.end_date && event.end_date !== event.date) {
          const eventEndDate = new Date(event.end_date);
          eventEndDate.setHours(0, 0, 0, 0);
          
          if (today >= eventStartDate && today <= eventEndDate) {
            // Event läuft gerade: zeige Tage bis zum Ende
            daysUntil = Math.ceil((eventEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            // Event startet in der Zukunft: zeige Tage bis zum Start
            daysUntil = Math.ceil((eventStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
        } else {
          // Eintägiges Event: zeige Tage bis zum Start
          daysUntil = Math.ceil((eventStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        return {
          ...event,
          type: 'event' as const,
          daysUntil: daysUntil,
          displayImage: event.images && event.images.length > 0 
            ? `/uploads/${event.images[0].filename}`
            : `/image${Math.floor(Math.random() * 4) + 1}.jpg`,
          date: event.date
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Hole alle anstehenden Aufgaben (todo und in-progress) chronologisch sortiert
  const getUpcomingTasks = () => {
    const upcomingTasks = tasks
      .filter(task => 
        task.status === 'todo' || task.status === 'in-progress'
      )
      .sort((a, b) => {
        // Sortiere nach Due Date, falls vorhanden, sonst nach Erstellungsdatum
        const aDate = a.due_date ? new Date(a.due_date) : new Date(a.created_at);
        const bDate = b.due_date ? new Date(b.due_date) : new Date(b.created_at);
        return aDate.getTime() - bDate.getTime();
      });
    
    console.log('Upcoming tasks:', upcomingTasks); // Debug-Output
    return upcomingTasks;
  };

  // Hole Tasks die heute fällig oder überfällig sind
  const getTodayAndOverdueTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return tasks
      .filter(task => {
        if (task.status === 'done') return false; // Erledigte ausschließen
        if (!task.due_date) return false; // Ohne Fälligkeitsdatum ausschließen
        
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        
        // Heute oder in der Vergangenheit
        return dueDate <= today;
      })
      .sort((a, b) => {
        // Sortiere nach Due Date aufsteigend (älteste zuerst)
        const aDate = new Date(a.due_date!);
        const bDate = new Date(b.due_date!);
        return aDate.getTime() - bDate.getTime();
      });
  };

  // Formatiere die Tage bis zum Event
  const formatDaysUntil = (days: number, event?: any) => {
    // Für laufende mehrtägige Events
    if (event && event.end_date && event.end_date !== event.date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const eventStartDate = new Date(event.date);
      eventStartDate.setHours(0, 0, 0, 0);
      const eventEndDate = new Date(event.end_date);
      eventEndDate.setHours(0, 0, 0, 0);
      
      if (today >= eventStartDate && today <= eventEndDate) {
        // Event läuft gerade
        if (days === 0) return 'Endet heute';
        if (days === 1) return 'Endet morgen';
        return `Endet in ${days} Tag${days === 1 ? '' : 'en'}`;
      }
    }
    
    // Standard-Formatierung für zukünftige Events
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

  // ===== PROJEKT HANDLER =====
  const handleSaveProject = async () => {
    if (!newProject.title) return;

    try {
      setIsLoading(true);
      
      const projectData = {
        title: newProject.title,
        description: newProject.description,
        status: editingProject ? editingProject.status : 'todo',
        priority: editingProject ? editingProject.priority : 'medium',
        linked_event_id: newProject.linked_event_id,
        due_date: newProject.due_date || undefined,
        color: newProject.color
      };

      if (editingProject && editingProject.id) {
        // Update Project
        const response = await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(projectData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        // Create Project
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(projectData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await loadProjects();
      setShowProjectModal(false);
      setEditingProject(null);
      setNewProject({
        title: '',
        description: '',
        linked_event_id: undefined,
        due_date: '',
        color: '#4a9eff'
      });
    } catch (err) {
      console.error('Fehler beim Speichern des Projekts:', err);
      setError('Fehler beim Speichern des Projekts.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await loadProjects();
    } catch (err) {
      console.error('Fehler beim Löschen des Projekts:', err);
      setError('Fehler beim Löschen des Projekts.');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== TASK HANDLER =====
  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const dbTasks = await response.json();
      setTasks(dbTasks);
    } catch (err) {
      console.error('Fehler beim Laden der Tasks:', err);
      setTasks([]);
    }
  };

  // Baby-Daten laden
  const loadBabyData = async () => {
    try {
      // Lade Sparstand
      const savings = await apiService.getBabySavings();
      setBabySavings(savings.amount);
      setBabyTarget(savings.target);
      
      // Lade Items
      const items = await apiService.getBabyItems();
      setBabyItems(items.map(item => ({
        ...item,
        shopLink: item.shop_link
      })));
    } catch (err) {
      console.error('Fehler beim Laden der Baby-Daten:', err);
      // Fallback auf lokale Werte
    }
  };

  // Hilfsfunktion: Projektname anhand project_id finden
  const getProjectName = (projectId: number): string => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.title : 'Kein Projekt';
  };

  // Funktion zum Anzeigen von Beschreibung und Antwort
  const renderTaskContent = (task: Task) => {
    // Prüfe erst das separate result Feld (neues Format)
    if (task.result) {
      return (
        <>
          {task.description && (
            <div className="task-description">
              <p>{task.description}</p>
            </div>
          )}
          <div className="task-result">
            <p>
              <strong style={{ textDecoration: 'underline', color: '#2196F3' }}>
                {task.result}
              </strong>
            </p>
          </div>
        </>
      );
    }
    
    // Prüfe das alte Format (Antwort in der Beschreibung)
    if (task.description) {
      const answerMatch = task.description.match(/^(.*?)\s*Antwort[/:]?\s*(.+)$/);
      if (answerMatch) {
        const [, originalText, answer] = answerMatch;
        return (
          <>
            {originalText.trim() && (
              <div className="task-description">
                <p>{originalText.trim()}</p>
              </div>
            )}
            <div className="task-result">
              <p>
                <strong style={{ textDecoration: 'underline', color: '#2196F3' }}>
                  {answer.trim()}
                </strong>
              </p>
            </div>
          </>
        );
      }
      
      // Normale Beschreibung ohne Antwort
      return (
        <div className="task-description">
          <p>{task.description}</p>
        </div>
      );
    }
    
    return null;
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !selectedProjectId) return;

    try {
      setIsLoading(true);
      
      const taskData = {
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        project_id: selectedProjectId,
        due_date: newTask.due_date || null,
        result: newTask.result || null
      };

      if (editingTask && editingTask.id) {
        const response = await fetch(`/api/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(taskData),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      await loadTasks();
      setShowTaskModal(false);
      setEditingTask(null);
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        project_id: 0,
        due_date: '',
        result: ''
      });
    } catch (err) {
      console.error('Fehler beim Speichern der Task:', err);
      setError('Fehler beim Speichern der Task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await loadTasks();
    } catch (err) {
      console.error('Fehler beim Löschen der Task:', err);
      setError('Fehler beim Löschen der Task.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTaskStatus = async (id: number, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
      setIsLoading(true);
      
      // Sicherstellen, dass id eine Zahl ist
      const taskId = typeof id === 'string' ? parseInt(id) : id;
      
      // Zuerst die aktuelle Task-Daten holen
      const currentTask = tasks.find(task => {
        const taskIdNum = typeof task.id === 'string' ? parseInt(task.id) : task.id;
        return taskIdNum === taskId;
      });
      
      if (!currentTask) {
        throw new Error('Task nicht gefunden');
      }
      
      if (!currentTask.title) {
        throw new Error('Task hat keinen gültigen Titel');
      }
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title: currentTask.title,
          description: currentTask.description || '',
          status: newStatus,
          due_date: currentTask.due_date || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await loadTasks();
    } catch (err) {
      console.error('Fehler beim Aktualisieren der Task:', err);
      setError('Fehler beim Aktualisieren der Task.');
    } finally {
      setIsLoading(false);
    }
  };

  // ===== COLUMN NAME EDITING HANDLERS =====
  const startEditingColumn = (columnKey: string) => {
    setEditingColumn(columnKey);
    setTempColumnName(columnNames[columnKey as keyof typeof columnNames]);
  };

  const saveColumnName = () => {
    if (editingColumn && tempColumnName.trim()) {
      setColumnNames(prev => ({
        ...prev,
        [editingColumn]: tempColumnName.trim()
      }));
    }
    setEditingColumn(null);
    setTempColumnName('');
  };

  const cancelEditingColumn = () => {
    setEditingColumn(null);
    setTempColumnName('');
  };

  const handleColumnNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveColumnName();
    } else if (e.key === 'Escape') {
      cancelEditingColumn();
    }
  };

  // ===== EVENT HANDLER =====

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

  const [showDayActionModal, setShowDayActionModal] = useState(false);
  const [selectedDateForAction, setSelectedDateForAction] = useState('');

  const handleDayClick = (date: string) => {
    setSelectedDateForAction(date);
    setShowDayActionModal(true);
  };

  const handleCreateEvent = (date: string) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setNewEvent({ title: '', type: 'anniversary', description: '', recurring: false, isMultiDay: false });
    setSelectedEndDate('');
    setEventImages([]);
    setShowEventModal(true);
    setShowDayActionModal(false);
  };

  const handleCreateTask = (date: string) => {
    // Prüfe, ob ein Projekt ausgewählt ist oder standardmäßig das erste verwenden
    const projectId = selectedProjectId || (projects.length > 0 ? projects[0].id : 0);
    
    if (projectId === 0) {
      setError('Bitte erstelle zuerst ein Projekt, um Tasks zu erstellen.');
      setShowDayActionModal(false);
      return;
    }

    setNewTask({
      title: '',
      description: '',
      status: 'todo',
      project_id: projectId,
      due_date: date,
      result: ''
    });
    setEditingTask(null);
    setShowTaskModal(true);
    setShowDayActionModal(false);
  };

  // Handler für das Klicken auf ein Event, Task oder Notiz auf der Startseite
  const handleStartPageItemClick = (item: any) => {
    if (item.type === 'event') {
      handleEditEvent(item);
    } else if (item.type === 'task') {
      // Zum Planer wechseln und das entsprechende Projekt auswählen
      setActiveSection('planer');
      setSelectedProjectId(item.project_id || (projects.find(p => p.title === item.project_title)?.id) || null);
      
      // Optional: Task zum Bearbeiten öffnen
      const task = tasks.find(t => t.id === parseInt(item.id.replace('task-', '')));
      if (task) {
        setEditingTask(task);
        setNewTask({
          title: task.title,
          description: task.description || '',
          status: task.status,
          project_id: task.project_id,
          due_date: task.due_date || '',
          result: task.result || ''
        });
        setShowTaskModal(true);
      }
    } else if (item.type === 'note') {
      // Zu Notizen wechseln und die entsprechende Notiz zum Bearbeiten öffnen
      setActiveSection('notizen');
      handleEditNote(item);
    }
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

  // Handler für Task-Klick - navigiere zu entsprechender Kanban-Seite
  const handleTaskClick = (task: Task) => {
    // Wechsle zur Planer-Sektion (Kanban-Board)
    setActiveSection('planer');
    // Setze die entsprechende Projekt-ID direkt
    setSelectedProjectId(task.project_id);
    
    // Optional: Scrolle zur entsprechenden Task-Karte oder öffne Details
    setTimeout(() => {
      const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Füge visuellen Highlight-Effekt hinzu
        taskElement.classList.add('highlight');
        setTimeout(() => taskElement.classList.remove('highlight'), 2000);
      }
    }, 100);
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

  // Drag & Drop Handler für Tasks
  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    
    // Visual feedback für das gezogene Element
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleTaskDragEnd = (e: React.DragEvent) => {
    setDraggedTask(null);
    setDragOverColumn(null);
    
    // Opacity zurücksetzen
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
  };

  const handleColumnDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnStatus);
  };

  const handleColumnDragLeave = (e: React.DragEvent) => {
    // Nur wenn wir wirklich die Spalte verlassen (nicht bei Child-Elementen)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleColumnDrop = async (e: React.DragEvent, newStatus: 'todo' | 'in-progress' | 'done') => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== newStatus) {
      await updateTaskStatus(draggedTask.id, newStatus);
    }
    setDraggedTask(null);
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

  // Hilfsfunktion für Tasks mit Fälligkeitsdatum
  const getTasksForDate = (date: string) => {
    return tasks.filter(task => task.due_date === date);
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
      const dayTasks = getTasksForDate(dateString);
      const isToday = isCurrentMonth && day === todayDate;
      
      let dayClass = 'day';
      if (isToday) dayClass += ' today';
      if (dayEvents.length > 0) dayClass += ` has-event anniversary`;
      if (dayTasks.length > 0) dayClass += ` has-task`;
      
      days.push(
        <div 
          key={day}
          className={dayClass}
          onClick={() => handleDayClick(dateString)}
        >
          {day}
          {dayEvents.map((event, index) => (
            <div key={`event-${index}`} className="event-dot" onClick={(e) => e.stopPropagation()}>
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
          {dayTasks.map((task, index) => (
            <div key={`task-${index}`} className="task-dot" onClick={(e) => e.stopPropagation()}>
              <span className="task-title-dot">📋 {task.title}</span>
              <div className="task-status-indicator">{task.status === 'done' ? '✅' : task.status === 'in-progress' ? '🔄' : '📌'}</div>
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
    { id: 'finanzen', label: 'Finanzen', icon: '💰' },
    { id: 'baby', label: 'Baby', icon: '👶' },
    { id: 'notizen', label: 'Notizen', icon: '📝' },
    { id: 'einstellungen', label: 'Einstellungen', icon: '⚙️' },
  ];

  const renderContent = () => {
    // Quick route for Stories page
    if (activeSection === 'stories') {
      return (
        <div className="stories-container">
          <Stories />
        </div>
      );
    }
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
              {/* Anstehende Anlässe - nur Events */}
              <div className="rail">
                <h2>Anstehende Anlässe</h2>
                <div className="rail-container">
                  <button 
                    className="rail-scroll-btn left" 
                    onClick={() => scrollRail('upcoming-events', 'left')}
                    aria-label="Nach links scrollen"
                  >
                    ‹
                  </button>
                  <div className="rail-items" id="upcoming-events">
                  {getUpcomingEvents().length > 0 ? (
                    getUpcomingEvents().map((event, index) => (
                      <div key={event.id || index} className="rail-card flip-card" onClick={() => handleStartPageItemClick(event)}>
                        <div className="flip-card-inner">
                          {/* Vorderseite */}
                          <div className="flip-card-front">
                            <div 
                              className="card-image"
                              style={{
                                backgroundImage: `url(${getOptimizedImageUrl(event.displayImage)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
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
                              <p>{formatDaysUntil(event.daysUntil, event)}</p>
                              <small>{new Date(event.date).toLocaleDateString('de-DE', { 
                                day: '2-digit', 
                                month: 'short',
                                year: 'numeric'
                              })}
                              </small>
                            </div>
                          </div>
                          
                          {/* Rückseite */}
                          <div className="flip-card-back">
                            <div 
                              className="card-image"
                              style={{
                                backgroundImage: `url(${getOptimizedImageUrl(event.displayImage)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
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
                                <small>{formatDaysUntil(event.daysUntil, event)}</small>
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
                  <button 
                    className="rail-scroll-btn right" 
                    onClick={() => scrollRail('upcoming-events', 'right')}
                    aria-label="Nach rechts scrollen"
                  >
                    ›
                  </button>
                </div>
              </div>

              {/* Heute & Überfällige Aufgaben - Kritischer Fokus */}
              {getTodayAndOverdueTasks().length > 0 && (
                <div className="rail rail-urgent">
                  <h2>🔥 Heute & Überfällig</h2>
                  <div className="rail-container">
                    <button 
                      className="rail-scroll-btn left" 
                      onClick={() => scrollRail('urgent-tasks', 'left')}
                      aria-label="Nach links scrollen"
                    >
                      ‹
                    </button>
                    <div className="rail-items" id="urgent-tasks">
                    {getTodayAndOverdueTasks().map((task, index) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(task.due_date!);
                      dueDate.setHours(0, 0, 0, 0);
                      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div 
                          key={task.id || index} 
                          className={`rail-card flip-card ampel-${task.status || 'todo'} ${daysOverdue > 0 ? 'overdue-task' : 'today-task'}`}
                          onClick={() => handleTaskClick(task)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="flip-card-inner">
                            {/* Vorderseite */}
                            <div className="flip-card-front">
                              <div 
                                className="card-image"
                                style={{
                                  backgroundImage: `url(${task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }}
                              >
                                <img 
                                  src={task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"}
                                  alt={task.title}
                                  onError={(e) => handleImageError(e, '/image2.jpg')}
                                  loading="lazy"
                                  style={{
                                    imageRendering: 'auto',
                                    filter: 'brightness(1.05) contrast(1.02)'
                                  }}
                                />
                                <div className={`status-indicator status-${task.status || 'todo'}`}></div>
                                {daysOverdue > 0 && (
                                  <div className="overdue-badge">{daysOverdue} Tag{daysOverdue === 1 ? '' : 'e'} überfällig</div>
                                )}
                                {daysOverdue === 0 && (
                                  <div className="today-badge">Heute fällig</div>
                                )}
                              </div>
                              <div className="card-content">
                                <h4>{task.title}</h4>
                                <p className="task-project">{getProjectName(task.project_id)}</p>
                                <small>
                                  {daysOverdue > 0 
                                    ? `⚠️ ${daysOverdue} Tag${daysOverdue === 1 ? '' : 'e'} überfällig`
                                    : '📅 Heute fällig'
                                  }
                                </small>
                              </div>
                            </div>
                            
                            {/* Rückseite */}
                            <div className="flip-card-back">
                              <div 
                                className="card-image"
                                style={{
                                  backgroundImage: `url(${task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }}
                              >
                                <img 
                                  src={task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"}
                                  alt={task.title}
                                  onError={(e) => handleImageError(e, '/image2.jpg')}
                                  loading="lazy"
                                  style={{
                                    imageRendering: 'auto',
                                    filter: 'brightness(1.05) contrast(1.02)'
                                  }}
                                />
                                <div className="image-overlay"></div>
                              </div>
                              <div className="card-content card-content-back">
                                <h4>{task.title}</h4>
                                <p className="task-description">
                                  {renderTaskContent(task)}
                                </p>
                                <div className="task-meta">
                                  <small className="task-project">{getProjectName(task.project_id)}</small>
                                  <small>
                                    {daysOverdue > 0 
                                      ? `⚠️ ${daysOverdue} Tag${daysOverdue === 1 ? '' : 'e'} überfällig`
                                      : '📅 Heute fällig'
                                    }
                                  </small>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                    <button 
                      className="rail-scroll-btn right" 
                      onClick={() => scrollRail('urgent-tasks', 'right')}
                      aria-label="Nach rechts scrollen"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}

              {/* Anstehende Aufgaben */}
              <div className="rail">
                <h2>Anstehende Aufgaben</h2>
                <div className="rail-container">
                  <button 
                    className="rail-scroll-btn left" 
                    onClick={() => scrollRail('upcoming-tasks', 'left')}
                    aria-label="Nach links scrollen"
                  >
                    ‹
                  </button>
                  <div className="rail-items" id="upcoming-tasks">
                  {getUpcomingTasks().length > 0 ? (
                    getUpcomingTasks().map((task, index) => (
                      <div 
                        key={task.id || index} 
                        className={`rail-card flip-card ampel-${task.status || 'todo'}`}
                        onClick={() => handleTaskClick(task)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="flip-card-inner">
                          {/* Vorderseite */}
                          <div className="flip-card-front">
                            <div 
                              className="card-image"
                              style={{
                                backgroundImage: `url(${task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
                              <img 
                                src={task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"}
                                alt={task.title}
                                onError={(e) => handleImageError(e, '/image2.jpg')}
                                loading="lazy"
                                style={{
                                  imageRendering: 'auto',
                                  filter: 'brightness(1.05) contrast(1.02)'
                                }}
                              />
                              <div className={`status-indicator status-${task.status || 'todo'}`}></div>
                            </div>
                            <div className="card-content">
                              <h4>{task.title}</h4>
                              <p className="task-project">{getProjectName(task.project_id)}</p>
                              <small>
                                {task.due_date ? 
                                  `Bis: ${new Date(task.due_date).toLocaleDateString('de-DE', { 
                                    day: '2-digit', 
                                    month: 'short'
                                  })}` : 
                                  `Status: ${task.status === 'todo' ? 'Zu erledigen' : task.status === 'in-progress' ? 'In Bearbeitung' : 'Erledigt'}`
                                }
                              </small>
                            </div>
                          </div>
                          
                          {/* Rückseite */}
                          <div className="flip-card-back">
                            <div 
                              className="card-image"
                              style={{
                                backgroundImage: `url(${task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            >
                              <img 
                                src={task.images && task.images.length > 0 ? task.images[0].path : "/image2.jpg"}
                                alt={task.title}
                                onError={(e) => handleImageError(e, '/image2.jpg')}
                                loading="lazy"
                                style={{
                                  imageRendering: 'auto',
                                  filter: 'brightness(1.05) contrast(1.02)'
                                }}
                              />
                              <div className="image-overlay"></div>
                            </div>
                            <div className="card-content card-content-back">
                              <h4>{task.title}</h4>
                              <p className="task-description">
                                {task.description || 'Keine Beschreibung verfügbar'}
                              </p>
                              <div className="task-meta">
                                <small>{task.result && task.result.trim() ? task.result : 'Noch keine Lösung'}</small>
                                <small>
                                  {task.due_date ? 
                                    `Bis: ${new Date(task.due_date).toLocaleDateString('de-DE', { 
                                      day: '2-digit', 
                                      month: 'short'
                                    })}` : 
                                    `Status: ${task.status === 'todo' ? 'Zu erledigen' : task.status === 'in-progress' ? 'In Bearbeitung' : 'Erledigt'}`
                                  }
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rail-card empty-state">
                      <div className="card-image">
                        <img src="/image2.jpg" alt="Keine Aufgaben" />
                      </div>
                      <div className="card-content">
                        <h4>Keine anstehenden Aufgaben</h4>
                        <p>Alle Aufgaben sind erledigt!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Zuletzt hinzugefügt */}
              <div className="rail">
                <h2>Zuletzt hinzugefügt</h2>
                <div className="rail-items" id="latest-notes">
                  {notes.length > 0 ? (
                    notes
                      .sort((a, b) => new Date(b.updated_at || b.created_at!).getTime() - new Date(a.updated_at || a.created_at!).getTime())
                      // Alle Notizen anzeigen - horizontal scrollbar
                      .map((note, index) => (
                        <div key={note.id || index} className="rail-card">
                          <div 
                            className="card-image"
                            style={{
                              backgroundImage: `url(${note.image_path ? getOptimizedImageUrl(note.image_path) : '/image3.jpg'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <img 
                              src={note.image_path ? getOptimizedImageUrl(note.image_path) : '/image3.jpg'} 
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
                  <button 
                    className="rail-scroll-btn right" 
                    onClick={() => scrollRail('upcoming-tasks', 'right')}
                    aria-label="Nach rechts scrollen"
                  >
                    ›
                  </button>
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
            return note.image_path;
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
      case 'planer':
        return (
          <div className="planer-view">
            <div className="planer-header">
              <h1>📋 Projekt Übersicht</h1>
              <button className="add-project-btn" onClick={() => setShowProjectModal(true)}>
                + Neues Projekt anlegen
              </button>
            </div>
            
            <div className="projects-overview">
              {projects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>Noch keine Projekte vorhanden</h3>
                  <p>Erstellen Sie Ihr erstes Projekt, um loszulegen!</p>
                  <button className="create-first-project-btn" onClick={() => setShowProjectModal(true)}>
                    Erstes Projekt erstellen
                  </button>
                </div>
              ) : (
                <div className="projects-list">
                  {projects.map(project => (
                    <div 
                      key={project.id} 
                      className="project-overview-card"
                      onClick={() => setSelectedProjectId(project.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="project-card-header">
                        <div className="project-title-section">
                          <h3>{project.title}</h3>
                        </div>
                        <div className="project-actions">
                          <button 
                            className="edit-project-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // Verhindert das Öffnen des Kanban-Boards
                              setEditingProject(project);
                              setNewProject({
                                title: project.title,
                                description: project.description || '',
                                linked_event_id: project.linked_event_id,
                                due_date: project.due_date || '',
                                color: project.color || '#4a9eff'
                              });
                              setShowProjectModal(true);
                            }}
                          >
                            ✏️ Bearbeiten
                          </button>
                          <button 
                            className="delete-project-btn"
                            onClick={(e) => {
                              e.stopPropagation(); // Verhindert das Öffnen des Kanban-Boards
                              handleDeleteProject(project.id);
                            }}
                          >
                            🗑️ Löschen
                          </button>
                        </div>
                      </div>
                      
                      {project.description && (
                        <div className="project-description">
                          <p>{project.description}</p>
                        </div>
                      )}
                      
                      <div className="project-meta-info">
                        {project.linked_event_id && (
                          <div className="meta-row">
                            <span className="meta-label">Verknüpftes Event:</span>
                            <span className="linked-event-info">
                              {events.find(e => e.id === project.linked_event_id)?.title || 'Event nicht gefunden'}
                            </span>
                          </div>
                        )}
                        
                        {project.due_date && (
                          <div className="meta-row">
                            <span className="meta-label">Fälligkeitsdatum:</span>
                            <span className="due-date-info">
                              {new Date(project.due_date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        )}
                        
                        <div className="meta-row">
                          <span className="meta-label">Erstellt:</span>
                          <span className="created-date">
                            {new Date(project.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Project Modal */}
            {showProjectModal && (
              <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}</h3>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Titel</label>
                      <input
                        type="text"
                        value={newProject.title}
                        onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                        placeholder="Projekt-Titel..."
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Beschreibung</label>
                      <textarea
                        value={newProject.description}
                        onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                        placeholder="Beschreibung des Projekts..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Fälligkeitsdatum (optional)</label>
                      <input
                        type="date"
                        value={newProject.due_date}
                        onChange={(e) => setNewProject({...newProject, due_date: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Mit Event verknüpfen (optional)</label>
                      <select
                        value={newProject.linked_event_id || ''}
                        onChange={(e) => setNewProject({...newProject, linked_event_id: e.target.value ? parseInt(e.target.value) : undefined})}
                      >
                        <option value="">Kein Event</option>
                        {events
                          .filter(event => {
                            const eventDate = new Date(event.date);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0); // Setze Zeit auf 00:00:00 für Vergleich
                            return eventDate >= today; // Nur heutige und zukünftige Events
                          })
                          .map(event => (
                            <option key={event.id} value={event.id}>
                              {event.title} ({new Date(event.date).toLocaleDateString('de-DE')})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button onClick={() => {
                      setShowProjectModal(false);
                      setEditingProject(null);
                      setNewProject({
                        title: '',
                        description: '',
                        linked_event_id: undefined,
                        due_date: '',
                        color: '#4a9eff'
                      });
                    }}>
                      Abbrechen
                    </button>
                    <button className="primary" onClick={handleSaveProject}>
                      {editingProject ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'baby':
        return (
          <div className="content">
            <h1>👶 Baby Planung</h1>
            
            {/* Finanzplan Section */}
            <div className="baby-section">
              <div className="section-header">
                <h2>💰 Finanzplan - Erstausstattung</h2>
                <button 
                  className="add-btn"
                  onClick={() => setShowAddMoneyModal(true)}
                >
                  + Geld hinzufügen
                </button>
              </div>
              
              <div className="savings-card">
                <div className="savings-info">
                  <div className="savings-amount">
                    <span className="current-amount">{babySavings.toFixed(2)}€</span>
                    <span className="target-amount">von {babyTarget.toFixed(2)}€</span>
                  </div>
                  <div className="savings-percentage">
                    {((babySavings / babyTarget) * 100).toFixed(1)}% erreicht
                  </div>
                </div>
                
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${Math.min((babySavings / babyTarget) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="savings-remaining">
                  Noch {Math.max(babyTarget - babySavings, 0).toFixed(2)}€ bis zum Ziel
                </div>
              </div>
            </div>

            {/* Einkaufsliste Section */}
            <div className="baby-section">
              <div className="section-header">
                <h2>🛒 Einkaufsliste</h2>
                <button 
                  className="add-btn"
                  onClick={() => {
                    setEditingBabyItem(null);
                    setNewBabyItem({ title: '', notes: '', cost: 0, shopLink: '' });
                    setBabyItemImage(null);
                    setShowBabyItemModal(true);
                  }}
                >
                  + Artikel hinzufügen
                </button>
              </div>
              
              <div className="baby-items-grid">
                {babyItems.length > 0 ? (
                  babyItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="rail-card flip-card baby-item-flip-card"
                      onClick={() => {
                        setEditingBabyItem(item);
                        setNewBabyItem({
                          title: item.title,
                          notes: item.notes,
                          cost: item.cost,
                          shopLink: item.shop_link || ''
                        });
                        setBabyItemImage(null);
                        setShowBabyItemModal(true);
                      }}
                    >
                      <div className="flip-card-inner">
                        {/* Vorderseite */}
                        <div className="flip-card-front">
                          <div 
                            className="card-image"
                            style={{
                              backgroundImage: `url(${item.image_path || '/image1.jpg'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <img 
                              src={item.image_path || '/image1.jpg'} 
                              alt={item.title}
                              onError={(e) => handleImageError(e, '/image1.jpg')}
                              loading="lazy"
                              style={{
                                imageRendering: 'auto',
                                filter: 'brightness(1.05) contrast(1.02)'
                              }}
                            />
                          </div>
                          <div className="card-content">
                            <h4>{item.title}</h4>
                            <p className="baby-item-cost-preview">{item.cost.toFixed(2)}€</p>
                          </div>
                        </div>
                        
                        {/* Rückseite */}
                        <div className="flip-card-back">
                          <div 
                            className="card-image"
                            style={{
                              backgroundImage: `url(${item.image_path || '/image1.jpg'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                          >
                            <img 
                              src={item.image_path || '/image1.jpg'} 
                              alt={item.title}
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
                            <h4>{item.title}</h4>
                            <p className="baby-item-notes">
                              {item.notes || 'Keine Notizen vorhanden'}
                            </p>
                            <div className="baby-item-meta">
                              <div className="baby-item-cost">{item.cost.toFixed(2)}€</div>
                              {item.shop_link && (
                                <a 
                                  href={item.shop_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="baby-item-shop-link"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  🛒 Zum Shop
                                </a>
                              )}
                            </div>
                            <button 
                              className="baby-item-delete"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Möchten Sie diesen Artikel wirklich löschen?')) {
                                  try {
                                    await apiService.deleteBabyItem(item.id);
                                    setBabyItems(babyItems.filter(i => i.id !== item.id));
                                  } catch (err) {
                                    console.error('Fehler beim Löschen des Baby Items:', err);
                                    setError('Fehler beim Löschen des Artikels.');
                                  }
                                }
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rail-card empty-state">
                    <div className="card-image">
                      <img src="/image1.jpg" alt="Keine Artikel" />
                    </div>
                    <div className="card-content">
                      <h4>Noch keine Artikel</h4>
                      <p>Erstelle deinen ersten Baby-Artikel!</p>
                    </div>
                  </div>
                )}
              </div>
              
              {babyItems.length > 0 && (
                <div className="baby-items-summary">
                  <strong>Gesamtkosten:</strong> {babyItems.reduce((sum, item) => sum + item.cost, 0).toFixed(2)}€
                </div>
              )}
            </div>

            {/* Geld hinzufügen Modal */}
            {showAddMoneyModal && (
              <div className="modal-overlay" onClick={() => setShowAddMoneyModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>Geld zur Rücklage hinzufügen</h2>
                    <button className="close-btn" onClick={() => setShowAddMoneyModal(false)}>✕</button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Betrag (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={moneyToAdd}
                        onChange={(e) => setMoneyToAdd(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setShowAddMoneyModal(false)}>
                      Abbrechen
                    </button>
                    <button 
                      className="save-btn"
                      onClick={async () => {
                        const amount = parseFloat(moneyToAdd);
                        if (!isNaN(amount) && amount > 0) {
                          try {
                            const result = await apiService.addBabySavings(amount);
                            setBabySavings(result.amount);
                            setBabyTarget(result.target);
                            setMoneyToAdd('');
                            setShowAddMoneyModal(false);
                          } catch (err) {
                            console.error('Fehler beim Hinzufügen von Geld:', err);
                            setError('Fehler beim Speichern des Betrags.');
                          }
                        }
                      }}
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Baby Artikel Modal */}
            {showBabyItemModal && (
              <div className="modal-overlay" onClick={() => {
                setShowBabyItemModal(false);
                setEditingBabyItem(null);
                setBabyItemImage(null);
                setNewBabyItem({ title: '', notes: '', cost: 0, shopLink: '' });
              }}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h2>{editingBabyItem ? 'Artikel bearbeiten' : 'Artikel hinzufügen'}</h2>
                    <button className="close-btn" onClick={() => {
                      setShowBabyItemModal(false);
                      setEditingBabyItem(null);
                      setBabyItemImage(null);
                      setNewBabyItem({ title: '', notes: '', cost: 0, shopLink: '' });
                    }}>✕</button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Artikel</label>
                      <input
                        type="text"
                        placeholder="z.B. Kinderwagen, Wickeltisch..."
                        value={newBabyItem.title}
                        onChange={(e) => setNewBabyItem({...newBabyItem, title: e.target.value})}
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label>Notizen</label>
                      <textarea
                        placeholder="Details, Marke, Besonderheiten..."
                        value={newBabyItem.notes}
                        onChange={(e) => setNewBabyItem({...newBabyItem, notes: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="form-group">
                      <label>Kosten (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newBabyItem.cost || ''}
                        onChange={(e) => setNewBabyItem({...newBabyItem, cost: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Shop-Link (optional)</label>
                      <input
                        type="url"
                        placeholder="https://shop.de/artikel..."
                        value={newBabyItem.shopLink}
                        onChange={(e) => setNewBabyItem({...newBabyItem, shopLink: e.target.value})}
                      />
                      <small style={{ color: '#888', fontSize: '0.8rem' }}>
                        Link zum Artikel im Shop - klickbar auf der Kachel
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Bild (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Datei-Größe prüfen (50MB Limit)
                            if (file.size > 50 * 1024 * 1024) {
                              setError('Datei ist zu groß. Maximal 50MB erlaubt.');
                              return;
                            }
                            // Bild komprimieren
                            try {
                              const compressed = await compressImage(file);
                              setBabyItemImage(compressed);
                              setError(null);
                            } catch (err) {
                              console.error('Komprimierungsfehler:', err);
                              setBabyItemImage(file);
                            }
                          } else {
                            setBabyItemImage(null);
                          }
                        }}
                      />
                      <small style={{ color: '#888', fontSize: '0.8rem' }}>
                        Unterstützte Formate: JPG, PNG, GIF. Max. 50MB.
                        {babyItemImage && ' (Wird automatisch zu 300x300px komprimiert)'}
                      </small>
                      {babyItemImage && (
                        <div className="image-preview">
                          <img 
                            src={URL.createObjectURL(babyItemImage)} 
                            alt="Vorschau" 
                            style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '10px' }}
                          />
                          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                            {babyItemImage.name} ({(babyItemImage.size / 1024 / 1024).toFixed(2)} MB)
                          </div>
                        </div>
                      )}
                      {editingBabyItem?.image_path && !babyItemImage && (
                        <div className="current-image">
                          <label>Aktuelles Bild:</label>
                          <img 
                            src={editingBabyItem.image_path} 
                            alt="Aktuelles Bild" 
                            style={{ maxWidth: '200px', maxHeight: '150px', borderRadius: '4px', marginTop: '10px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => {
                      setShowBabyItemModal(false);
                      setEditingBabyItem(null);
                      setBabyItemImage(null);
                      setNewBabyItem({ title: '', notes: '', cost: 0, shopLink: '' });
                    }}>
                      Abbrechen
                    </button>
                    <button 
                      className="save-btn"
                      onClick={async () => {
                        if (newBabyItem.title.trim()) {
                          try {
                            setIsLoading(true);
                            
                            if (editingBabyItem) {
                              // Bearbeitungsmodus - Backend aktualisieren
                              const updatedItem = await apiService.updateBabyItem(
                                editingBabyItem.id,
                                {
                                  title: newBabyItem.title,
                                  notes: newBabyItem.notes,
                                  cost: newBabyItem.cost,
                                  shop_link: newBabyItem.shopLink
                                },
                                babyItemImage || undefined
                              );
                              
                              // State aktualisieren
                              setBabyItems(prev => prev.map(item => 
                                item.id === editingBabyItem.id 
                                  ? { ...updatedItem, shopLink: updatedItem.shop_link }
                                  : item
                              ));
                            } else {
                              // Neu-Hinzufügen-Modus - Backend erstellen
                              const createdItem = await apiService.createBabyItem(
                                {
                                  title: newBabyItem.title,
                                  notes: newBabyItem.notes,
                                  cost: newBabyItem.cost,
                                  shop_link: newBabyItem.shopLink
                                },
                                babyItemImage || undefined
                              );
                              
                              // State aktualisieren
                              setBabyItems(prev => [...prev, {
                                ...createdItem,
                                shopLink: createdItem.shop_link
                              }]);
                            }
                            
                            // Modal schließen und Felder zurücksetzen
                            setNewBabyItem({ title: '', notes: '', cost: 0, shopLink: '' });
                            setBabyItemImage(null);
                            setEditingBabyItem(null);
                            setShowBabyItemModal(false);
                            setError(null);
                          } catch (err) {
                            console.error('Fehler beim Speichern des Baby Items:', err);
                            setError('Fehler beim Speichern des Artikels. Bitte versuchen Sie es erneut.');
                          } finally {
                            setIsLoading(false);
                          }
                        }
                      }}
                    >
                      {editingBabyItem ? 'Speichern' : 'Hinzufügen'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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

  // Wenn ein Projekt für Kanban ausgewählt ist, zeige das Kanban-Board
  if (selectedProjectId) {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const projectTasks = tasks.filter(task => task.project_id === selectedProjectId);
    
    const todoTasks = projectTasks.filter(task => task.status === 'todo');
    const inProgressTasks = projectTasks.filter(task => task.status === 'in-progress');
    const doneTasks = projectTasks.filter(task => task.status === 'done');

    return (
      <div className="app">
        <div className="main-content">
          <div className="kanban-board-view">
            {/* Kanban Header */}
            <div className="kanban-header">
              <button 
                className="back-btn"
                onClick={() => setSelectedProjectId(null)}
              >
                ← Zurück
              </button>
              <h1>{selectedProject?.title || 'Projekt'}</h1>
              <button 
                className="add-task-btn"
                onClick={() => {
                  setNewTask({
                    title: '',
                    description: '',
                    status: 'todo',
                    project_id: selectedProjectId,
                    due_date: '',
                    result: ''
                  });
                  setShowTaskModal(true);
                }}
              >
                + Neue Aufgabe
              </button>
            </div>

            {/* Kanban Columns */}
            <div className="kanban-columns">
              {/* Todo Column */}
              <div 
                className={`kanban-column ${dragOverColumn === 'todo' ? 'drag-over' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'todo')}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, 'todo')}
              >
                <div className="column-header">
                  {editingColumn === 'todo' ? (
                    <input
                      type="text"
                      value={tempColumnName}
                      onChange={(e) => setTempColumnName(e.target.value)}
                      onKeyDown={handleColumnNameKeyPress}
                      onBlur={saveColumnName}
                      className="column-name-input"
                      autoFocus
                    />
                  ) : (
                    <div className="column-title-container">
                      <h3>{columnNames.todo}</h3>
                      <button 
                        className="edit-column-btn"
                        onClick={() => startEditingColumn('todo')}
                        title="Spaltennamen bearbeiten"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  <span className="task-count">{todoTasks.length}</span>
                </div>
                <div className="column-content">
                  {todoTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-card status-${task.status}`}
                      data-task-id={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      onDragEnd={handleTaskDragEnd}
                    >
                      <div className="task-header">
                        <h4>{task.title}</h4>
                        <div className="task-actions">
                          <button 
                            className="edit-task-btn"
                            onClick={() => {
                              setEditingTask(task);
                              setNewTask({
                                title: task.title,
                                description: task.description || '',
                                status: task.status,
                                project_id: task.project_id,
                                due_date: task.due_date || '',
                                result: task.result || ''
                              });
                              setShowTaskModal(true);
                            }}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {renderTaskContent(task)}
                      {task.due_date && (
                        <div className="task-due-date">
                          📅 {new Date(task.due_date).toLocaleDateString('de-DE')}
                        </div>
                      )}
                      <div className="task-actions-bottom">
                        <button 
                          className="move-task-btn"
                          onClick={() => updateTaskStatus(task.id, 'in-progress')}
                        >
                          → In Bearbeitung
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In Progress Column */}
              <div 
                className={`kanban-column ${dragOverColumn === 'in-progress' ? 'drag-over' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'in-progress')}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, 'in-progress')}
              >
                <div className="column-header">
                  {editingColumn === 'in-progress' ? (
                    <input
                      type="text"
                      value={tempColumnName}
                      onChange={(e) => setTempColumnName(e.target.value)}
                      onKeyDown={handleColumnNameKeyPress}
                      onBlur={saveColumnName}
                      className="column-name-input"
                      autoFocus
                    />
                  ) : (
                    <div className="column-title-container">
                      <h3>{columnNames['in-progress']}</h3>
                      <button 
                        className="edit-column-btn"
                        onClick={() => startEditingColumn('in-progress')}
                        title="Spaltennamen bearbeiten"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  <span className="task-count">{inProgressTasks.length}</span>
                </div>
                <div className="column-content">
                  {inProgressTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-card status-${task.status}`}
                      data-task-id={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      onDragEnd={handleTaskDragEnd}
                    >
                      <div className="task-header">
                        <h4>{task.title}</h4>
                        <div className="task-actions">
                          <button 
                            className="edit-task-btn"
                            onClick={() => {
                              setEditingTask(task);
                              setNewTask({
                                title: task.title,
                                description: task.description || '',
                                status: task.status,
                                project_id: task.project_id,
                                due_date: task.due_date || '',
                                result: task.result || ''
                              });
                              setShowTaskModal(true);
                            }}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {renderTaskContent(task)}
                      {task.due_date && (
                        <div className="task-due-date">
                          📅 {new Date(task.due_date).toLocaleDateString('de-DE')}
                        </div>
                      )}
                      <div className="task-actions-bottom">
                        <button 
                          className="move-task-btn"
                          onClick={() => updateTaskStatus(task.id, 'todo')}
                        >
                          ← Zurück
                        </button>
                        <button 
                          className="move-task-btn"
                          onClick={() => updateTaskStatus(task.id, 'done')}
                        >
                          → Erledigt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Done Column */}
              <div 
                className={`kanban-column ${dragOverColumn === 'done' ? 'drag-over' : ''}`}
                onDragOver={(e) => handleColumnDragOver(e, 'done')}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleColumnDrop(e, 'done')}
              >
                <div className="column-header">
                  {editingColumn === 'done' ? (
                    <input
                      type="text"
                      value={tempColumnName}
                      onChange={(e) => setTempColumnName(e.target.value)}
                      onKeyDown={handleColumnNameKeyPress}
                      onBlur={saveColumnName}
                      className="column-name-input"
                      autoFocus
                    />
                  ) : (
                    <div className="column-title-container">
                      <h3>{columnNames.done}</h3>
                      <button 
                        className="edit-column-btn"
                        onClick={() => startEditingColumn('done')}
                        title="Spaltennamen bearbeiten"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  <span className="task-count">{doneTasks.length}</span>
                </div>
                <div className="column-content">
                  {doneTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-card status-${task.status}`}
                      data-task-id={task.id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      onDragEnd={handleTaskDragEnd}
                    >
                      <div className="task-header">
                        <h4>{task.title}</h4>
                        <div className="task-actions">
                          <button 
                            className="edit-task-btn"
                            onClick={() => {
                              setEditingTask(task);
                              setNewTask({
                                title: task.title,
                                description: task.description || '',
                                status: task.status,
                                project_id: task.project_id,
                                due_date: task.due_date || '',
                                result: task.result || ''
                              });
                              setShowTaskModal(true);
                            }}
                          >
                            ✏️
                          </button>
                          <button 
                            className="delete-task-btn"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      {renderTaskContent(task)}
                      {task.due_date && (
                        <div className="task-due-date">
                          📅 {new Date(task.due_date).toLocaleDateString('de-DE')}
                        </div>
                      )}
                      <div className="task-actions-bottom">
                        <button 
                          className="move-task-btn"
                          onClick={() => updateTaskStatus(task.id, 'in-progress')}
                        >
                          ← Zurück
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Task Modal */}
            {showTaskModal && (
              <div className="task-modal" onClick={() => setShowTaskModal(false)}>
                <div className="task-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="task-modal-header">
                    <h3>{editingTask ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}</h3>
                    <button 
                      className="close-modal-btn"
                      onClick={() => setShowTaskModal(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <form className="task-form" onSubmit={(e) => { e.preventDefault(); handleSaveTask(); }}>
                    <div className="form-group">
                      <label>Titel</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="form-group">
                      <label>Beschreibung</label>
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        placeholder="Beschreibung der Aufgabe..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={newTask.status}
                        onChange={(e) => setNewTask({...newTask, status: e.target.value as 'todo' | 'in-progress' | 'done'})}
                      >
                        <option value="todo">Zu erledigen</option>
                        <option value="in-progress">In Bearbeitung</option>
                        <option value="done">Erledigt</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Fälligkeitsdatum</label>
                      <input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                        placeholder="Wann soll die Aufgabe erledigt werden?"
                      />
                    </div>
                    {newTask.status === 'done' && (
                      <div className="form-group">
                        <label>Antwort/Resultat</label>
                        <textarea
                          value={newTask.result}
                          onChange={(e) => setNewTask({...newTask, result: e.target.value})}
                          placeholder="Was ist die Antwort auf die Frage oder das Ergebnis der Aufgabe?"
                          rows={3}
                        />
                        <small className="form-hint">
                          Dieses Feld wird zur Beschreibung hinzugefügt, wenn die Aufgabe als erledigt markiert wird.
                        </small>
                      </div>
                    )}
                    
                    {/* Bild-Upload für Aufgaben */}
                    {editingTask && (
                      <div className="form-group">
                        <label>Bilder</label>
                        <div className="image-upload-section">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file && editingTask.id) {
                                const formData = new FormData();
                                formData.append('image', file);
                                
                                try {
                                  const response = await fetch(`/api/tasks/${editingTask.id}/images`, {
                                    method: 'POST',
                                    body: formData
                                  });
                                  
                                  if (response.ok) {
                                    // Reload tasks to get updated image list
                                    await loadTasks();
                                    // Update editingTask with new image
                                    const updatedTask = tasks.find(t => t.id === editingTask.id);
                                    if (updatedTask) {
                                      setEditingTask(updatedTask);
                                    }
                                  }
                                } catch (error) {
                                  console.error('Fehler beim Hochladen:', error);
                                }
                                
                                // Reset input
                                e.target.value = '';
                              }
                            }}
                            className="image-upload-input"
                          />
                          
                          {editingTask.images && editingTask.images.length > 0 && (
                            <div className="uploaded-images">
                              {editingTask.images.map((image, index) => (
                                <div key={index} className="uploaded-image">
                                  <img src={image.path} alt={`Task Bild ${index + 1}`} />
                                  <button
                                    type="button"
                                    className="delete-image-btn"
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(`/api/tasks/${editingTask.id}/images/${image.filename}`, {
                                          method: 'DELETE'
                                        });
                                        
                                        if (response.ok) {
                                          await loadTasks();
                                          const updatedTask = tasks.find(t => t.id === editingTask.id);
                                          if (updatedTask) {
                                            setEditingTask(updatedTask);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Fehler beim Löschen:', error);
                                      }
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="task-form-actions">
                      <button 
                        type="button"
                        className="cancel-task-btn"
                        onClick={() => setShowTaskModal(false)}
                      >
                        Abbrechen
                      </button>
                      <button 
                        type="submit"
                        className="save-task-btn"
                      >
                        {editingTask ? 'Aktualisieren' : 'Erstellen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        
        {/* Panorama Header - nur für Startseite, AUSSERHALB content-area für volle Breite */}
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
        
        <div className="content-area">
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
                        src={editingNote.image_path} 
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

        {/* Day Action Selection Modal */}
        {showDayActionModal && (
          <div className="modal-overlay">
            <div className="modal action-selection-modal">
              <div className="modal-header">
                <h3>Was möchtest du erstellen?</h3>
                <button 
                  className="close-modal-btn"
                  onClick={() => setShowDayActionModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <p>Für den {new Date(selectedDateForAction).toLocaleDateString('de-DE')}:</p>
                <div className="action-buttons">
                  <button 
                    className="action-btn event-btn"
                    onClick={() => handleCreateEvent(selectedDateForAction)}
                  >
                    📅 Ereignis hinzufügen
                  </button>
                  <button 
                    className="action-btn task-btn"
                    onClick={() => handleCreateTask(selectedDateForAction)}
                  >
                    📋 Aufgabe erstellen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
