const db = require('../database');
const telegramConfig = require('../config/telegram');

class TaskSummaryService {
  constructor() {
    this.db = db; // Direkte Verwendung der DB-Instanz
  }

  /**
   * Hilfsmethode: Alle Projekte abrufen
   */
  getAllProjects() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM projects ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Hilfsmethode: Alle Tasks abrufen
   */
  getAllTasks() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM tasks ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Erstellt eine formatierte Zusammenfassung aller anstehenden Aufgaben
   * @returns {Promise<string>} - Formatierte Nachricht
   */
  async generateTaskSummary() {
    try {
      // Alle Projekte und deren Aufgaben abrufen
      const projects = await this.getAllProjects();
      const allTasks = await this.getAllTasks();
      
      if (!projects.length) {
        return '📝 *Keine Projekte vorhanden*\n\nZeit, neue Ziele zu setzen! 🎯';
      }

      let summary = '🗓️ *Deine anstehenden Aufgaben:*\n\n';
      let hasActiveTasks = false;

      for (const project of projects) {
        const projectTasks = allTasks.filter(task => task.project_id === project.id);
        const activeTasks = projectTasks.filter(task => task.status !== 'completed');
        
        if (activeTasks.length === 0) continue;

        hasActiveTasks = true;
        summary += `📋 *${project.title}:*\n`;

        // Aufgaben nach Status gruppieren
        const inProgressTasks = activeTasks.filter(task => task.status === 'in-progress');
        const todoTasks = activeTasks.filter(task => task.status === 'todo');

        // In Bearbeitung
        if (inProgressTasks.length > 0) {
          summary += '  ⏳ *In Bearbeitung:*\n';
          for (const task of inProgressTasks.slice(0, telegramConfig.MESSAGE_SETTINGS.MAX_TASKS_PER_PROJECT)) {
            const dueDateStr = this.formatDueDate(task.due_date);
            summary += `    • ${task.title}${dueDateStr}\n`;
          }
        }

        // Offene Aufgaben
        if (todoTasks.length > 0) {
          summary += '  📝 *Offen:*\n';
          for (const task of todoTasks.slice(0, telegramConfig.MESSAGE_SETTINGS.MAX_TASKS_PER_PROJECT)) {
            const dueDateStr = this.formatDueDate(task.due_date);
            const priorityEmoji = this.getPriorityEmoji(task.priority);
            summary += `    • ${priorityEmoji}${task.title}${dueDateStr}\n`;
          }
        }

        summary += '\n';
      }

      if (!hasActiveTasks) {
        return '🎉 *Alle Aufgaben erledigt!*\n\nGeniales Management! Zeit für neue Herausforderungen. 💪';
      }

      // Zusätzliche Statistiken
      const totalActiveTasks = allTasks.filter(task => task.status !== 'completed').length;
      const overdueTasks = this.getOverdueTasks(allTasks);
      
      summary += `📊 *Übersicht:*\n`;
      summary += `• Aktive Aufgaben: ${totalActiveTasks}\n`;
      
      if (overdueTasks.length > 0) {
        summary += `• ⚠️ Überfällig: ${overdueTasks.length}\n`;
      }

      return summary;

    } catch (error) {
      console.error('❌ Fehler beim Generieren der Aufgaben-Zusammenfassung:', error);
      return '🚨 *Fehler beim Laden der Aufgaben*\n\nBitte prüfe die Datenbank-Verbindung.';
    }
  }

  /**
   * Formatiert das Fälligkeitsdatum für die Anzeige
   * @param {string} dueDate - Due Date im ISO Format
   * @returns {string} - Formatierte Datumsanzeige
   */
  formatDueDate(dueDate) {
    if (!dueDate) return '';

    const due = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Datum ohne Zeit für Vergleiche
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dueDay.getTime() === todayDay.getTime()) {
      return ' *(heute)*';
    } else if (dueDay.getTime() === tomorrowDay.getTime()) {
      return ' *(morgen)*';
    } else if (dueDay < todayDay) {
      const daysDiff = Math.ceil((todayDay - dueDay) / (1000 * 60 * 60 * 24));
      return ` *⚠️ (${daysDiff} Tag${daysDiff > 1 ? 'e' : ''} überfällig)*`;
    } else {
      return ` *(${due.toLocaleDateString('de-DE')})*`;
    }
  }

  /**
   * Gibt Prioritäts-Emoji zurück
   * @param {number} priority - Prioritätslevel
   * @returns {string} - Emoji
   */
  getPriorityEmoji(priority) {
    switch (priority) {
      case 3: return '🔴 '; // Hoch
      case 2: return '🟡 '; // Normal
      case 1: return '🟢 '; // Niedrig
      default: return '';
    }
  }

  /**
   * Findet überfällige Aufgaben
   * @param {Array} tasks - Alle Aufgaben
   * @returns {Array} - Überfällige Aufgaben
   */
  getOverdueTasks(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });
  }

  /**
   * Generiert Smart Reminder für Morgen - nur heute fällige + in Bearbeitung
   * @returns {Promise<string>} - Morgen-spezifische Nachricht
   */
  async generateMorningReminder() {
    try {
      const projects = await this.getAllProjects();
      const allTasks = await this.getAllTasks();
      
      // Heute fällige Tasks + Tasks in Bearbeitung
      const todayTasks = this.getTodayTasks(allTasks);
      const inProgressTasks = allTasks.filter(task => task.status === 'in-progress');
      
      // Kombination ohne Duplikate
      const relevantTaskIds = new Set([...todayTasks.map(t => t.id), ...inProgressTasks.map(t => t.id)]);
      const relevantTasks = allTasks.filter(task => relevantTaskIds.has(task.id));
      
      if (relevantTasks.length === 0) {
        return '🌅 *Guten Morgen!*\n\nHeute stehen keine Aufgaben an 🎉\nGenieße deinen freien Tag! ☕';
      }

      let summary = '🌅 *Guten Morgen! Deine heutigen Aufgaben:*\n\n';
      let hasContent = false;

      for (const project of projects) {
        const projectTasks = relevantTasks.filter(task => task.project_id === project.id);
        if (projectTasks.length === 0) continue;

        hasContent = true;
        summary += `📋 *${project.title}:*\n`;

        for (const task of projectTasks) {
          const priorityEmoji = this.getPriorityEmoji(task.priority);
          const statusEmoji = task.status === 'in-progress' ? '⏳ ' : '📝 ';
          const dueDateStr = this.formatDueDate(task.due_date);
          summary += `  ${statusEmoji}${priorityEmoji}${task.title}${dueDateStr}\n`;
        }
        summary += '\n';
      }

      if (!hasContent) {
        return '🌅 *Guten Morgen!*\n\nHeute stehen keine Aufgaben an 🎉\nGenieße deinen freien Tag! ☕';
      }

      summary += `💪 *Lass uns den Tag rocken!*`;
      return summary;

    } catch (error) {
      console.error('❌ Fehler beim Generieren des Morgen-Reminders:', error);
      return '🌅 *Guten Morgen!*\n\n🚨 Fehler beim Laden der heutigen Aufgaben.';
    }
  }

  /**
   * Generiert Smart Reminder für Abend - Review + Reflektion
   * @returns {Promise<string>} - Abend-spezifische Nachricht
   */
  async generateEveningReminder() {
    try {
      const allTasks = await this.getAllTasks();
      
      // Heute abgeschlossene Tasks
      const todayCompleted = this.getTodayCompletedTasks(allTasks);
      
      // Überfällige Tasks
      const overdueTasks = this.getOverdueTasks(allTasks);
      
      // Morgige Tasks
      const tomorrowTasks = await this.getTomorrowTasks();
      
      let summary = '🌙 *Guten Abend! Tagesrückblick:*\n\n';

      // Abgeschlossene Tasks heute
      if (todayCompleted.length > 0) {
        summary += '✅ *Heute erledigt:*\n';
        todayCompleted.forEach(task => {
          summary += `  • ${task.title}\n`;
        });
        summary += '\n';
      }

      // Überfällige Tasks (Warnung)
      if (overdueTasks.length > 0) {
        summary += '⚠️ *Noch überfällig:*\n';
        overdueTasks.slice(0, 3).forEach(task => { // Max 3 zeigen
          const daysDiff = Math.ceil((new Date() - new Date(task.due_date)) / (1000 * 60 * 60 * 24));
          summary += `  • ${task.title} *(${daysDiff} Tag${daysDiff > 1 ? 'e' : ''})*\n`;
        });
        summary += '\n';
      }

      // Morgige Tasks
      if (tomorrowTasks.length > 0) {
        summary += '🌅 *Für morgen geplant:*\n';
        tomorrowTasks.forEach(task => {
          const priorityEmoji = this.getPriorityEmoji(task.priority);
          summary += `  • ${priorityEmoji}${task.title}\n`;
        });
        summary += '\n';
      }

      // Motivationsende je nach Situation
      if (todayCompleted.length > 0) {
        summary += '🎉 *Gut gemacht heute!*';
      } else if (tomorrowTasks.length > 0) {
        summary += '💪 *Bereit für morgen!*';
      } else {
        summary += '🌙 *Entspannten Abend!*';
      }

      return summary;

    } catch (error) {
      console.error('❌ Fehler beim Generieren des Abend-Reminders:', error);
      return '🌙 *Guten Abend!*\n\n🚨 Fehler beim Laden der Tagesübersicht.';
    }
  }

  /**
   * Findet alle heute fälligen Aufgaben
   * @param {Array} tasks - Alle Aufgaben
   * @returns {Array} - Heute fällige Aufgaben
   */
  getTodayTasks(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      if (!task.due_date || task.status === 'completed') return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= today && dueDate <= todayEnd;
    });
  }

  /**
   * Findet alle heute abgeschlossenen Aufgaben
   * @param {Array} tasks - Alle Aufgaben
   * @returns {Array} - Heute abgeschlossene Aufgaben
   */
  getTodayCompletedTasks(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      if (task.status !== 'completed' || !task.completed_at) return false;
      const completedDate = new Date(task.completed_at);
      return completedDate >= today && completedDate <= todayEnd;
    });
  }

  /**
   * Findet Aufgaben für morgen
   * @returns {Promise<Array>} - Morgige Aufgaben
   */
  async getTomorrowTasks() {
    try {
      const allTasks = await this.getAllTasks();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      return allTasks.filter(task => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= tomorrow && dueDate <= tomorrowEnd;
      });
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der morgigen Aufgaben:', error);
      return [];
    }
  }
}

module.exports = TaskSummaryService;