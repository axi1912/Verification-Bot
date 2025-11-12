// Wrapper to initialize MongoDB and web server before starting the bot
require('dotenv').config();
const db = require('./Data/db-mongo');

async function start() {
    console.log('🚀 Starting Verification Bot System...\n');
    
    // Conectar a MongoDB
    console.log('📊 Connecting to MongoDB...');
    await db.connectDB();
    await db.initStats();
    console.log('✅ MongoDB connected successfully\n');
    
    // Iniciar el servidor web
    console.log('🌐 Starting web server...');
    require('./webserver.js');
    
    // Dar tiempo para que el servidor se inicie
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Iniciar el bot
    console.log('🤖 Starting Discord bot...');
    require('./index.js');
}

start().catch(console.error);
