const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./relationship_organizer.db');

console.log('=== Checking Tasks Table ===');

db.all('SELECT id, title, description, status, project_id FROM tasks', (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log(`Found ${rows.length} tasks:`);
    rows.forEach(task => {
        console.log(`ID: ${task.id}, Title: "${task.title}", Status: ${task.status}, Project: ${task.project_id}`);
        if (!task.title || task.title === null) {
            console.log(`⚠️  Task ${task.id} has NULL title!`);
        }
    });
    
    db.close();
});
