require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, PermissionFlagsBits } = require('discord.js');
const db = require('./Data/db-mongo');
const { createVerification, getVerificationStatus } = require('./webserver');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Almacenar sesiones de verificación OAuth2 activas
const verificationSessions = new Map();

// Definir comandos slash
const commands = [
    {
        name: 'setup-verification',
        description: 'Setup the verification panel'
    },
    {
        name: 'setup-howto',
        description: 'Setup the how to verify instructions panel'
    }
];

client.once('ready', async () => {
    // Conectar a MongoDB
    await db.connectDB();
    await db.initStats();

    
    
    console.log

        console.log(`✅ Verification Bot connected as ${client.user.tag}`);
    
    // Establecer estado de actividad
    client.user.setPresence({
        activities: [{ name: 'Server Security', type: 3 }], // Type 3 = WATCHING
        status: 'online'
    });
    
    // Registrar comandos slash
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('📝 Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered successfully');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

// Función para crear el panel de verificación
async function setupVerificationPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('Welcome to')
        .setDescription('**factoryboosts.com**\n\n**Who are we?**\n> Welcome to Factory Boosts! Find premium services and products with guaranteed satisfaction.\n\n**What do we sell?**\n> We offer a wide range of products and services, and we are continuously expanding. Please visit our website to explore our services.\n\n**Welcome from us,**\n> We look forward to your joining us. If you have any concerns or issues, feel free to reach out to us on our support.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447962061567951041/FactoryBoosts.com_960_x_540_px.png?ex=69398741&is=693835c1&hm=78db644923b0727d080db0eed6826a9616c00a0418edd68c1872cdf3af8b3491&')
        .setFooter({ text: 'Factory Boosts All Rights Reserved.' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('Verify')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setLabel('Website')
                .setEmoji('🌐')
                .setStyle(ButtonStyle.Link)
                .setURL('https://factoryboosts.com')
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de instrucciones
async function setupHowToPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('📋 HOW TO VERIFY')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1438385544043430030/banner_factory.gif')
        .addFields(
            {
                name: '\n**Step 1️⃣ • Go to Verification Channel**',
                value: 'Head over to the <#verify-here> channel (or the channel with the verification panel).',
                inline: false
            },
            {
                name: '\n**Step 2️⃣ • Click Verify Button**',
                value: 'Click the **"🔐 Start Verification"** button in the verification message.',
                inline: false
            },
            {
                name: '\n**Step 3️⃣ • Authenticate with Discord**',
                value: 'Click the link and authorize the application using Discord OAuth2. This verifies your real Discord account.',
                inline: false
            },
            {
                name: '\n**Step 4️⃣ • You\'re Done!**',
                value: 'Once verified, you\'ll automatically get access to all channels and can start chatting!',
                inline: false
            },
            {
                name: '\n💡 **Important Notes**',
                value: '• You only need to verify once\n• By verifying, you agree to follow server rules\n• If you have issues, contact a staff member',
                inline: false
            },
            {
                name: '\n🎉 **Welcome Aboard!**',
                value: 'We\'re excited to have you here. Enjoy your stay and make new friends!',
                inline: false
            }
        )
        .setFooter({ text: '🌟 Need help? Contact a staff member' })
        .setTimestamp();

    await channel.send({ embeds: [embed] });
}

// Manejo de interacciones
client.on('interactionCreate', async (interaction) => {
    try {
        // Prevenir procesamiento duplicado
        if (interaction.replied || interaction.deferred) {
            return;
        }

        // Comandos slash
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup-verification') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Only administrators can use this command.', 
                        ephemeral: true 
                    });
                }
                
                await interaction.reply({ content: '⏳ Creating verification panel...', ephemeral: true });
                await setupVerificationPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Verification panel created successfully!' });
            }
            
            if (interaction.commandName === 'setup-howto') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Only administrators can use this command.', 
                        ephemeral: true 
                    });
                }
                
                await interaction.reply({ content: '⏳ Creating how-to panel...', ephemeral: true });
                await setupHowToPanel(interaction.channel);
                await interaction.editReply({ content: '✅ How-to panel created successfully!' });
            }
            return;
        }

        // Botón de verificación
        if (interaction.isButton()) {
            if (interaction.customId === 'verify_button') {
                // Verificar si ya tiene el rol
                const verifiedRole = interaction.guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);
                
                if (!verifiedRole) {
                    return interaction.reply({ 
                        content: '❌ Verification role not found. Please contact an administrator.', 
                        ephemeral: true 
                    });
                }

                if (interaction.member.roles.cache.has(process.env.VERIFIED_ROLE_ID)) {
                    return interaction.reply({ 
                        content: '✅ You are already verified!', 
                        ephemeral: true 
                    });
                }

                // Crear verificación OAuth2
                const verification = createVerification(interaction.user.id, interaction.guild.id);
                
                // Guardar sesión para polling
                verificationSessions.set(verification.state, {
                    userId: interaction.user.id,
                    guildId: interaction.guild.id,
                    memberId: interaction.member.id,
                    timestamp: Date.now()
                });

                const verifyEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🔐 Discord OAuth2 Verification')
                    .setDescription('**To complete verification, please follow these steps:**\n\n1️⃣ Click the button below to open the verification page\n2️⃣ Authorize the application with your Discord account\n3️⃣ Return here once completed\n\n⏱️ This link will expire in **10 minutes**')
                    .setFooter({ text: 'Secure OAuth2 Authentication • Your privacy is protected' })
                    .setTimestamp();

                const linkButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel('🔗 Verify with Discord OAuth2')
                            .setStyle(ButtonStyle.Link)
                            .setURL(verification.verificationUrl)
                    );

                await interaction.reply({ 
                    embeds: [verifyEmbed], 
                    components: [linkButton],
                    ephemeral: true 
                });

                // Polling para verificar cuando el usuario complete la autenticación
                const checkInterval = setInterval(async () => {
                    const status = getVerificationStatus(verification.state);
                    
                    if (status.verified) {
                        clearInterval(checkInterval);
                        
                        try {
                            // Dar el rol de verificado
                            const member = await interaction.guild.members.fetch(interaction.user.id);
                            await member.roles.add(verifiedRole);
                            
                            // Guardar verificación en base de datos
                            await db.addVerification(interaction.user.id, interaction.user.tag);
                            
                            // Limpiar sesión
                            verificationSessions.delete(verification.state);
                            
                            // Enviar mensaje de confirmación al usuario
                            const successEmbed = new EmbedBuilder()
                                .setColor('#00D9A3')
                                .setTitle('✅ Verification Successful!')
                                .setDescription(`Welcome to the server, ${interaction.user}!\n\n🎉 You have successfully verified your Discord account!\n\nYou now have access to all channels.`)
                                .setFooter({ text: 'Enjoy your stay!' })
                                .setTimestamp();

                            try {
                                await interaction.followUp({ 
                                    embeds: [successEmbed], 
                                    ephemeral: true 
                                });
                            } catch (err) {
                                console.log('Could not send follow-up message:', err.message);
                            }

                            console.log(`✅ ${interaction.user.tag} has been verified (OAuth2)`);
                        } catch (error) {
                            console.error('Error giving verified role:', error);
                            verificationSessions.delete(verification.state);
                        }
                    } else if (status.expired) {
                        clearInterval(checkInterval);
                        verificationSessions.delete(verification.state);
                        console.log(`⏱️ Verification expired for ${interaction.user.tag}`);
                    }
                }, 2000); // Check every 2 seconds

                // Auto-limpiar después de 10 minutos
                setTimeout(() => {
                    clearInterval(checkInterval);
                    verificationSessions.delete(verification.state);
                }, 10 * 60 * 1000);
            }
        }
    } catch (error) {
        console.error('Error in interaction:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
            }
        } catch (err) {
            console.error('Error responding to error:', err);
        }
    }
});

// Manejo de errores
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);

