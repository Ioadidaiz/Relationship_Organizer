/**
 * Telegram Bot Configuration
 * Alle sensitiven Daten werden über Umgebungsvariablen geladen
 */

require('dotenv').config();

const telegramConfig = {
    // Bot Token aus Environment Variable
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    
    // Chat ID aus Environment Variable
    chatId: process.env.TELEGRAM_CHAT_ID,
    
    // Timezone für Benachrichtigungen
    timezone: process.env.TELEGRAM_TIMEZONE || 'Europe/Berlin',
    
    // Cron Schedules
    schedules: {
        morning: process.env.TELEGRAM_MORNING_SCHEDULE || '0 10 * * *',
        evening: process.env.TELEGRAM_EVENING_SCHEDULE || '0 22 * * *'
    },
    
    // Feature Toggle
    enabled: process.env.TELEGRAM_NOTIFICATIONS_ENABLED === 'true',
    
    // Validation
    isValid() {
        if (!this.botToken) {
            console.error('❌ TELEGRAM_BOT_TOKEN ist nicht gesetzt!');
            return false;
        }
        if (!this.chatId) {
            console.error('❌ TELEGRAM_CHAT_ID ist nicht gesetzt!');
            return false;
        }
        return true;
    }
};

// Validierung beim Import
if (telegramConfig.enabled && !telegramConfig.isValid()) {
    console.warn('⚠️ Telegram-Konfiguration unvollständig. Features deaktiviert.');
    telegramConfig.enabled = false;
}

module.exports = telegramConfig;