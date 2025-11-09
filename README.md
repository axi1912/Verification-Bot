# Discord Verification Bot

Bot de verificación para servidor de Discord.

## Configuración

1. Instalar dependencias:
```bash
npm install
```

2. Configurar el archivo `.env` con tus credenciales:
   - DISCORD_TOKEN: Token del bot
   - CLIENT_ID: ID de la aplicación del bot
   - GUILD_ID: Ya configurado (1128489481935274054)
   - VERIFIED_ROLE_ID: Ya configurado (1247686451160813698)

3. Crear el bot en Discord Developer Portal:
   - https://discord.com/developers/applications
   - Bot → Reset Token → Copiar token al .env
   - OAuth2 → Client ID → Copiar al .env

4. Invitar el bot al servidor con permisos de:
   - Manage Roles
   - Send Messages
   - Use Slash Commands

5. Iniciar el bot:
```bash
npm start
```

6. Usar el comando `/setup-verification` en el canal donde quieres el panel

## Características

- ✅ Panel de verificación con embed personalizado
- ✅ Botón de verificación
- ✅ Asignación automática de rol
- ✅ Mensajes en inglés
- ✅ Sistema de seguridad (verificación única)
- ✅ Color mint (#00D9A3)
