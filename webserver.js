require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.WEB_PORT || 3000;

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'verification-bot-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 10 // 10 minutos
    }
}));

app.use(express.json());
app.use(express.static('public'));

// Almacenar estados de verificación pendientes
const pendingVerifications = new Map();

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar verificación con estado
app.get('/verify', (req, res) => {
    const state = req.query.state;
    
    if (!state || !pendingVerifications.has(state)) {
        return res.status(400).send('Invalid or expired verification link');
    }

    // Guardar estado en sesión
    req.session.verificationState = state;
    
    // Redirigir a OAuth2 de Discord
    const redirectUri = `${process.env.REDIRECT_URI}/callback`;
    const clientId = process.env.CLIENT_ID;
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
    
    res.redirect(authUrl);
});

// Callback de OAuth2
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.session.verificationState;
    
    if (!code) {
        return res.status(400).send('No authorization code provided');
    }
    
    if (!state || !pendingVerifications.has(state)) {
        return res.status(400).send('Invalid or expired verification session');
    }
    
    try {
        // Intercambiar código por token de acceso
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: `${process.env.REDIRECT_URI}/callback`
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        const accessToken = tokenResponse.data.access_token;
        
        // Obtener información del usuario
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });
        
        const discordUser = userResponse.data;
        const verificationData = pendingVerifications.get(state);
        
        // Verificar que el usuario que se autentica es el mismo que inició la verificación
        if (discordUser.id !== verificationData.userId) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Verification Failed</title>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Segoe UI', Arial, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 15px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 500px;
                        }
                        .error-icon {
                            font-size: 80px;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #e74c3c;
                            margin-bottom: 20px;
                        }
                        p {
                            color: #555;
                            font-size: 16px;
                            line-height: 1.6;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error-icon">❌</div>
                        <h1>Verification Failed</h1>
                        <p>You must authenticate with the same Discord account that initiated the verification.</p>
                        <p>Please try again from Discord.</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // Marcar como verificado
        verificationData.verified = true;
        verificationData.verifiedAt = new Date();
        
        // Limpiar la verificación pendiente después de 5 segundos (dar tiempo para que el bot procese)
        setTimeout(() => {
            pendingVerifications.delete(state);
        }, 5000);
        
        // Limpiar sesión
        req.session.destroy();
        
        // Página de éxito
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Verification Successful</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 15px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 500px;
                        animation: slideIn 0.5s ease-out;
                    }
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(-50px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .success-icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                        animation: bounce 1s;
                    }
                    @keyframes bounce {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.2); }
                    }
                    h1 {
                        color: #00D9A3;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #555;
                        font-size: 16px;
                        line-height: 1.6;
                    }
                    .user-info {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                    }
                    .close-message {
                        color: #888;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success-icon">✅</div>
                    <h1>Verification Successful!</h1>
                    <div class="user-info">
                        <p><strong>${discordUser.username}</strong></p>
                        <p>You have been verified successfully!</p>
                    </div>
                    <p>You can now return to Discord and access all channels.</p>
                    <p class="close-message">You can close this window now.</p>
                </div>
                <script>
                    // Auto-cerrar después de 5 segundos
                    setTimeout(() => {
                        window.close();
                    }, 5000);
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('OAuth2 error:', error.response?.data || error.message);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Verification Error</title>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 15px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                        text-align: center;
                        max-width: 500px;
                    }
                    .error-icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #e74c3c;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #555;
                        font-size: 16px;
                        line-height: 1.6;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">⚠️</div>
                    <h1>Authentication Error</h1>
                    <p>There was an error during the authentication process.</p>
                    <p>Please try again or contact an administrator.</p>
                </div>
            </body>
            </html>
        `);
    }
});

// API para verificar el estado de verificación (usado por el bot)
app.get('/api/check-verification/:state', (req, res) => {
    const state = req.params.state;
    const verification = pendingVerifications.get(state);
    
    if (!verification) {
        return res.json({ verified: false, expired: true });
    }
    
    res.json({
        verified: verification.verified || false,
        expired: false,
        userId: verification.userId
    });
});

// API para crear nueva verificación (usado por el bot)
app.post('/api/create-verification', (req, res) => {
    const { userId, guildId } = req.body;
    
    if (!userId || !guildId) {
        return res.status(400).json({ error: 'Missing userId or guildId' });
    }
    
    // Generar estado único
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Guardar verificación pendiente
    pendingVerifications.set(state, {
        userId,
        guildId,
        createdAt: new Date(),
        verified: false
    });
    
    // Auto-expirar después de 10 minutos
    setTimeout(() => {
        pendingVerifications.delete(state);
    }, 10 * 60 * 1000);
    
    const verificationUrl = `${process.env.REDIRECT_URI}/verify?state=${state}`;
    
    res.json({
        success: true,
        state,
        verificationUrl
    });
});

// Exportar la función para crear verificaciones (usada por el bot)
function createVerification(userId, guildId) {
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    pendingVerifications.set(state, {
        userId,
        guildId,
        createdAt: new Date(),
        verified: false
    });
    
    setTimeout(() => {
        pendingVerifications.delete(state);
    }, 10 * 60 * 1000);
    
    return {
        state,
        verificationUrl: `${process.env.REDIRECT_URI}/verify?state=${state}`
    };
}

function getVerificationStatus(state) {
    const verification = pendingVerifications.get(state);
    if (!verification) {
        return { verified: false, expired: true };
    }
    return {
        verified: verification.verified || false,
        expired: false,
        userId: verification.userId
    };
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`📍 Redirect URI: ${process.env.REDIRECT_URI}`);
});

module.exports = { createVerification, getVerificationStatus, app };
