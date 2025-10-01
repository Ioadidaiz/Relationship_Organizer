const cron = require('node-cron');
const TelegramService = require('./TelegramService');
const TaskSummaryService = require('./TaskSummaryService');
const telegramConfig = require('../config/telegram');

class TaskScheduler {
  constructor() {
    this.telegramService = new TelegramService();
    this.taskSummaryService = new TaskSummaryService();
    this.jobs = new Map();
    this.isEnabled = true;
  }

  /**
   * Startet alle geplanten Jobs
   */
  start() {
    if (!this.isEnabled) {
      console.log('📴 Task Scheduler ist deaktiviert');
      return;
    }

    console.log('🚀 Starte Task Scheduler...');
    
    // Morgen-Benachrichtigung (10:00 Uhr)
    this.scheduleMorningNotification();
    
    // Abend-Benachrichtigung (22:00 Uhr)
    this.scheduleEveningNotification();
    
    console.log('✅ Task Scheduler erfolgreich gestartet');
    console.log(`📅 Morgen-Benachrichtigung: ${telegramConfig.NOTIFICATION_SCHEDULES.MORNING}`);
    console.log(`🌙 Abend-Benachrichtigung: ${telegramConfig.NOTIFICATION_SCHEDULES.EVENING}`);
  }

  /**
   * Stoppt alle geplanten Jobs
   */
  stop() {
    console.log('🛑 Stoppe Task Scheduler...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Job gestoppt: ${name}`);
    });
    
    this.jobs.clear();
    console.log('✅ Task Scheduler gestoppt');
  }

  /**
   * Plant die Morgen-Benachrichtigung
   */
  scheduleMorningNotification() {
    const job = cron.schedule(
      telegramConfig.schedules.morning,
      async () => {
        console.log('🌅 Sende Morgen-Benachrichtigung...');
        await this.sendMorningNotification();
      },
      {
        scheduled: true,
        timezone: telegramConfig.TIMEZONE
      }
    );

    this.jobs.set('morning', job);
    console.log('📅 Morgen-Benachrichtigung geplant');
  }

  /**
   * Plant die Abend-Benachrichtigung
   */
  scheduleEveningNotification() {
    const job = cron.schedule(
      telegramConfig.schedules.evening,
      async () => {
        console.log('🌙 Sende Abend-Benachrichtigung...');
        await this.sendEveningNotification();
      },
      {
        scheduled: true,
        timezone: telegramConfig.TIMEZONE
      }
    );

    this.jobs.set('evening', job);
    console.log('🌙 Abend-Benachrichtigung geplant');
  }

  /**
   * Sendet die Morgen-Benachrichtigung
   */
  async sendMorningNotification() {
    try {
      const summary = await this.taskSummaryService.generateTimeSpecificSummary('morning');
      const success = await this.telegramService.sendTaskSummary(summary, 'morning');
      
      if (success) {
        console.log('✅ Morgen-Benachrichtigung erfolgreich gesendet');
      } else {
        console.error('❌ Morgen-Benachrichtigung fehlgeschlagen');
      }
    } catch (error) {
      console.error('❌ Fehler bei Morgen-Benachrichtigung:', error.message);
      await this.telegramService.sendErrorNotification(`Morgen-Benachrichtigung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Sendet die Abend-Benachrichtigung
   */
  async sendEveningNotification() {
    try {
      const summary = await this.taskSummaryService.generateTimeSpecificSummary('evening');
      const success = await this.telegramService.sendTaskSummary(summary, 'evening');
      
      if (success) {
        console.log('✅ Abend-Benachrichtigung erfolgreich gesendet');
      } else {
        console.error('❌ Abend-Benachrichtigung fehlgeschlagen');
      }
    } catch (error) {
      console.error('❌ Fehler bei Abend-Benachrichtigung:', error.message);
      await this.telegramService.sendErrorNotification(`Abend-Benachrichtigung fehlgeschlagen: ${error.message}`);
    }
  }

  /**
   * Aktiviert/Deaktiviert den Scheduler
   * @param {boolean} enabled - Aktivierungsstatus
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (enabled) {
      console.log('✅ Task Scheduler aktiviert');
      this.start();
    } else {
      console.log('❌ Task Scheduler deaktiviert');
      this.stop();
    }
  }

  /**
   * Manueller Test der Benachrichtigungen
   */
  async testNotifications() {
    console.log('🧪 Teste Telegram-Benachrichtigungen...');
    
    try {
      // Test Verbindung
      const connectionTest = await this.telegramService.testConnection();
      if (!connectionTest) {
        throw new Error('Telegram-Verbindung fehlgeschlagen');
      }

      // Test Morgen-Benachrichtigung
      console.log('📤 Teste Morgen-Benachrichtigung...');
      await this.sendMorningNotification();
      
      console.log('✅ Test erfolgreich abgeschlossen');
      return true;
    } catch (error) {
      console.error('❌ Test fehlgeschlagen:', error.message);
      return false;
    }
  }

  /**
   * Gibt Status-Informationen zurück
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      activeJobs: Array.from(this.jobs.keys()),
      timezone: telegramConfig.TIMEZONE,
      schedules: telegramConfig.NOTIFICATION_SCHEDULES
    };
  }

  /**
   * Sofortige Benachrichtigung senden (für Tests)
   */
  async sendImmediateNotification() {
    console.log('📤 Sende sofortige Test-Benachrichtigung...');
    const summary = await this.taskSummaryService.generateTaskSummary();
    return await this.telegramService.sendTaskSummary(summary, 'morning');
  }
}

module.exports = TaskScheduler;