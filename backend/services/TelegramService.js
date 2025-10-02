const TelegramBot = require('node-telegram-bot-api');
const telegramConfig = require('../config/telegram');

class TelegramService {
  constructor() {
    this.bot = new TelegramBot(telegramConfig.botToken, { polling: false });
    this.chatId = telegramConfig.chatId;
  }

  /**
   * Sendet eine Nachricht an den konfigurierten Telegram Chat
   * @param {string} message - Die zu sendende Nachricht
   * @param {object} options - Optionale Telegram-Optionen
   * @returns {Promise<boolean>} - Erfolg der Übertragung
   */
  async sendMessage(message, options = {}) {
    try {
      const defaultOptions = {
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
        ...options
      };

      await this.bot.sendMessage(this.chatId, message, defaultOptions);
      console.log(`✅ Telegram Nachricht erfolgreich gesendet`);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Senden der Telegram Nachricht:', error.message);
      return false;
    }
  }

  /**
   * Sendet eine formatierte Aufgaben-Zusammenfassung
   * @param {string} summary - Formatierte Aufgaben-Zusammenfassung
   * @param {string} timeOfDay - 'morning' oder 'evening'
   */
  async sendTaskSummary(summary, timeOfDay = 'morning') {
    const emoji = timeOfDay === 'morning' ? '🌅' : '🌙';
    const greeting = timeOfDay === 'morning' ? 'Guten Morgen!' : 'Guten Abend!';
    
    const message = `${emoji} *${greeting}*\n\n${summary}`;
    
    return await this.sendMessage(message);
  }

  /**
   * Testet die Telegram-Verbindung
   */
  async testConnection() {
    try {
      const testMessage = '🤖 *Beziehungs-Organizer Test*\n\nTelegram-Integration erfolgreich eingerichtet!';
      return await this.sendMessage(testMessage);
    } catch (error) {
      console.error('❌ Telegram Verbindungstest fehlgeschlagen:', error.message);
      return false;
    }
  }

  /**
   * Formatiert eine Notfall-Nachricht bei Systemfehlern
   * @param {string} error - Fehlermeldung
   */
  async sendErrorNotification(error) {
    const message = `🚨 *System Fehler*\n\nBeziehungs-Organizer: ${error}\n\nZeit: ${new Date().toLocaleString('de-DE', { timeZone: telegramConfig.TIMEZONE })}`;
    return await this.sendMessage(message);
  }
}

module.exports = TelegramService;