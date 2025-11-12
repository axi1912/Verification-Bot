# 🔐 Discord Verification Bot con OAuth2

Sistema de verificación profesional para servidores de Discord que utiliza **OAuth2 real** para autenticar usuarios en una página web externa.

## ✨ Características

- ✅ **Autenticación OAuth2 real** - Los usuarios se verifican en un sitio web externo
- 🔒 **Seguridad total** - No se puede falsificar, requiere autenticación de Discord
- 🌐 **Servidor web integrado** - Sistema completo en un solo proyecto
- 📊 **Base de datos MongoDB** - Registro de todas las verificaciones
- 🎨 **Interfaz moderna** - Páginas web profesionales con diseño atractivo
- ⚡ **Verificación automática** - El rol se asigna automáticamente tras OAuth2

## 📋 Requisitos

- Node.js v16 o superior
- MongoDB (local o Atlas)
- Aplicación de Discord configurada
- Dominio público (para producción) o ngrok/localhost (para pruebas)

## 🚀 Configuración Paso a Paso

### 1. Configurar Aplicación de Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación o selecciona una existente
3. Ve a la sección **OAuth2**
4. Agrega las siguientes **Redirect URIs**:
   ```
   http://localhost:3000/callback
   ```
   (En producción, usa tu dominio: `https://tudominio.com/callback`)

5. Copia el **Client ID** y **Client Secret**

### 2. Crear Rol de Verificado

1. En tu servidor de Discord, crea un rol llamado "Verified" (o como prefieras)
2. Haz clic derecho en el rol → Copiar ID del rol
3. Asegúrate de que el bot tenga permisos para asignar este rol

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Discord Bot Configuration
DISCORD_TOKEN=tu_token_del_bot
CLIENT_ID=tu_client_id_de_discord
CLIENT_SECRET=tu_client_secret_de_discord
GUILD_ID=tu_server_id
VERIFIED_ROLE_ID=tu_verified_role_id

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/verification-bot
# O usa MongoDB Atlas: mongodb+srv://usuario:password@cluster.mongodb.net/verification-bot

# Web Server Configuration
WEB_PORT=3000
REDIRECT_URI=http://localhost:3000
SESSION_SECRET=cambia-esto-por-algo-secreto-y-aleatorio

# Para producción, cambia REDIRECT_URI a tu dominio público:
# REDIRECT_URI=https://tudominio.com
```

### 4. Instalar Dependencias

```bash
npm install
```

### 5. Iniciar el Sistema

```bash
npm start
```

Esto iniciará:
- 🌐 Servidor web en el puerto 3000
- 🤖 Bot de Discord
- 📊 Conexión a MongoDB

## 📖 Cómo Funciona

### Flujo de Verificación:

1. **Usuario en Discord**: Presiona el botón "🔐 Start Verification"
2. **Bot envía link**: Recibe un enlace único y privado
3. **Abre página web**: El usuario hace clic en el enlace
4. **OAuth2 de Discord**: Es redirigido a Discord para autorizar
5. **Autenticación**: Discord verifica la identidad del usuario
6. **Verificación exitosa**: El bot le asigna el rol automáticamente
7. **Acceso completo**: El usuario ya puede ver todos los canales

### Seguridad:

- ✅ Cada enlace es único y expira en 10 minutos
- ✅ El usuario debe autenticarse con su cuenta real de Discord
- ✅ Se valida que el usuario que se autentica sea el mismo que inició
- ✅ Imposible de falsificar o automatizar con bots

## 🔧 Comandos del Bot

### `/setup-verification`
Crea el panel de verificación en el canal actual
- Solo administradores pueden usarlo

### `/setup-howto`
Crea el panel de instrucciones paso a paso
- Solo administradores pueden usarlo

## 🌐 Despliegue en Producción

### Opción 1: VPS/Servidor Dedicado

1. Sube el código a tu servidor
2. Configura nginx/apache como reverse proxy
3. Actualiza `REDIRECT_URI` en `.env` con tu dominio
4. Usa PM2 para mantener el bot corriendo:
   ```bash
   npm install -g pm2
   pm2 start start.js --name verification-bot
   pm2 save
   pm2 startup
   ```

### Opción 2: Railway.app

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node start.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

1. Sube a GitHub
2. Conecta con Railway
3. Agrega las variables de entorno
4. Railway te dará un dominio automático
5. Actualiza la Redirect URI en Discord Developer Portal

### Opción 3: Heroku

```
Procfile:
web: node start.js
```

## 📁 Estructura del Proyecto

```
Verification-Bot/
├── index.js              # Bot de Discord principal
├── webserver.js          # Servidor Express + OAuth2
├── start.js              # Inicializador del sistema
├── package.json          # Dependencias
├── .env                  # Variables de entorno (no incluir en git)
├── .env.example          # Ejemplo de configuración
├── public/
│   └── index.html        # Página de inicio
├── Data/
│   ├── db-mongo.js       # Conexión MongoDB
│   ├── database.json     # Datos locales
│   └── ...
└── README.md             # Este archivo
```

## 🔐 Variables de Entorno Explicadas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Token del bot de Discord | `MTIzNDU2Nzg5MDEyMzQ1Njc4OQ...` |
| `CLIENT_ID` | ID de la aplicación | `1234567890123456789` |
| `CLIENT_SECRET` | Secret de OAuth2 | `abcdef123456-secreto` |
| `GUILD_ID` | ID del servidor | `9876543210987654321` |
| `VERIFIED_ROLE_ID` | ID del rol a asignar | `1111111111111111111` |
| `MONGO_URI` | URI de MongoDB | `mongodb://localhost:27017/db` |
| `WEB_PORT` | Puerto del servidor web | `3000` |
| `REDIRECT_URI` | URL base del servidor | `http://localhost:3000` |
| `SESSION_SECRET` | Clave secreta de sesiones | `texto-aleatorio-seguro` |

## ❓ Solución de Problemas

### El bot no responde
- Verifica que `DISCORD_TOKEN` sea correcto
- Asegúrate de que el bot tenga los intents necesarios
- Revisa que los comandos slash estén registrados

### OAuth2 falla
- Verifica `CLIENT_ID` y `CLIENT_SECRET`
- Asegúrate de que `REDIRECT_URI` coincida exactamente con Discord Developer Portal
- Revisa que el callback URL esté agregado en Discord

### No se asigna el rol
- Verifica que `VERIFIED_ROLE_ID` sea correcto
- Asegúrate de que el rol del bot esté por encima del rol de verificado
- Revisa que el bot tenga permiso "Manage Roles"

### MongoDB no conecta
- Verifica que MongoDB esté corriendo
- Revisa el formato de `MONGO_URI`
- Para Atlas, asegúrate de permitir la IP en la whitelist

## 📝 Notas Importantes

⚠️ **Para producción:**
- Usa HTTPS (obligatorio para OAuth2)
- Usa un dominio real, no localhost
- Configura firewall y seguridad del servidor
- Usa variables de entorno seguras
- Habilita logs y monitoreo

## 📄 Licencia

ISC

## 👨‍💻 Autor

Tu nombre/organización

---

**¿Necesitas ayuda?** Abre un issue en GitHub o contacta al desarrollador.
