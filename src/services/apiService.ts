const API_BASE_URL = 'http://localhost:5000/api';

export interface CalendarEvent {
  id?: number;
  title: string;
  description?: string;
  date: string;
  end_date?: string; // Für mehrtägige Events
  is_recurring?: boolean;
  recurrence_type?: string;
  images?: ImageData[];
  created_at?: string;
  updated_at?: string;
}

export interface ImageData {
  id?: number;
  filename: string;
  original_name?: string;
  path: string;
  size?: number;
  mime_type?: string;
  description?: string;
  created_at?: string;
}

export interface Relationship {
  id?: number;
  name: string;
  relationship_type?: string;
  description?: string;
  anniversary_date?: string;
  image_id?: number;
  image_filename?: string;
  image_path?: string;
  created_at?: string;
  updated_at?: string;
}

class ApiService {
  // ===== EVENT SERVICES =====
  
  async getEvents(): Promise<CalendarEvent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/events`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen der Events:', error);
      throw error;
    }
  }

  async getEvent(id: number): Promise<CalendarEvent> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Fehler beim Abrufen des Events ${id}:`, error);
      throw error;
    }
  }

  async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Erstellen des Events:', error);
      throw error;
    }
  }

  async updateEvent(id: number, event: Partial<CalendarEvent>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Fehler beim Aktualisieren des Events ${id}:`, error);
      throw error;
    }
  }

  async deleteEvent(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error(`Fehler beim Löschen des Events ${id}:`, error);
      throw error;
    }
  }

  // ===== IMAGE SERVICES =====
  
  async uploadImage(file: File, description?: string): Promise<ImageData> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Hochladen des Bildes:', error);
      throw error;
    }
  }

  async getImages(): Promise<ImageData[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/images`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen der Bilder:', error);
      throw error;
    }
  }

  async addImageToEvent(eventId: number, imageId: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/images/${imageId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Bildes zum Event:', error);
      throw error;
    }
  }

  // ===== RELATIONSHIP SERVICES =====
  
  async getRelationships(): Promise<Relationship[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/relationships`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Abrufen der Beziehungen:', error);
      throw error;
    }
  }

  async createRelationship(relationship: Omit<Relationship, 'id' | 'created_at' | 'updated_at'>): Promise<Relationship> {
    try {
      const response = await fetch(`${API_BASE_URL}/relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(relationship),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Fehler beim Erstellen der Beziehung:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====
  
  getImageUrl(imagePath: string): string {
    return `http://localhost:5000${imagePath}`;
  }
  
  isServerRunning(): Promise<boolean> {
    return fetch(`${API_BASE_URL}/events`)
      .then(() => true)
      .catch(() => false);
  }
}

export const apiService = new ApiService();
