require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, PermissionFlagsBits } = require('discord.js');
const db = require('./Data/db-mongo');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// Almacenar sesiones de verificación activas
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
        .setColor('#00D9A3')
        .setTitle('🔐 SERVER VERIFICATION')
        .setDescription('Welcome to the server! Please verify yourself to gain access to all channels.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
            {
                name: '✨ Why Verify?',
                value: 'Verification helps us keep the community safe from spam, bots, and unwanted users.',
                inline: false
            },
            {
                name: '🎯 What You Get',
                value: '• Access to all server channels\n• Ability to chat and participate\n• Join our amazing community',
                inline: false
            },
            {
                name: '🔐 Security Check',
                value: 'You\'ll need to solve a simple CAPTCHA to prove you\'re human!',
                inline: false
            }
        )
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1436578775121920100/fau_get_2.gif')
        .setFooter({ text: '🔒 Secure Verification System with CAPTCHA' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('verify_button')
                .setLabel('🔐 Start Verification')
                .setStyle(ButtonStyle.Primary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de instrucciones
async function setupHowToPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('📋 HOW TO VERIFY')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
        .setThumbnail('https://cdn.discordapp.com/attachments/1309783318031503384/1436578775121920100/fau_get_2.gif')
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
                name: '\n**Step 3️⃣ • Solve the CAPTCHA**',
                value: 'Answer the math question correctly to prove you\'re human. You\'ll have 60 seconds!',
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

                // Generar CAPTCHA matemático
                const num1 = Math.floor(Math.random() * 10) + 1;
                const num2 = Math.floor(Math.random() * 10) + 1;
                const correctAnswer = num1 + num2;
                
                // Generar 4 opciones (incluyendo la correcta)
                const options = [correctAnswer];
                while (options.length < 4) {
                    const wrongAnswer = correctAnswer + Math.floor(Math.random() * 10) - 5;
                    if (wrongAnswer > 0 && wrongAnswer !== correctAnswer && !options.includes(wrongAnswer)) {
                        options.push(wrongAnswer);
                    }
                }
                
                // Mezclar las opciones
                options.sort(() => Math.random() - 0.5);
                
                // Guardar sesión de verificación
                const sessionId = `${interaction.user.id}_${Date.now()}`;
                verificationSessions.set(interaction.user.id, {
                    correctAnswer: correctAnswer,
                    sessionId: sessionId,
                    timestamp: Date.now()
                });
                
                // Auto-expirar después de 60 segundos
                setTimeout(() => {
                    verificationSessions.delete(interaction.user.id);
                }, 60000);

                const captchaEmbed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🔐 Security Verification')
                    .setDescription(`**Solve this math problem to verify you're human:**\n\n# ${num1} + ${num2} = ?\n\nSelect the correct answer below.\n⏱️ You have **60 seconds** to answer.`)
                    .setFooter({ text: 'Click the correct answer button' })
                    .setTimestamp();

                const buttonRow = new ActionRowBuilder()
                    .addComponents(
                        options.map(option => 
                            new ButtonBuilder()
                                .setCustomId(`captcha_${option}`)
                                .setLabel(option.toString())
                                .setStyle(ButtonStyle.Secondary)
                        )
                    );

                await interaction.reply({ 
                    embeds: [captchaEmbed], 
                    components: [buttonRow],
                    ephemeral: true 
                });
            }
            
            // Manejar respuestas del CAPTCHA
            if (interaction.customId.startsWith('captcha_')) {
                const selectedAnswer = parseInt(interaction.customId.split('_')[1]);
                const session = verificationSessions.get(interaction.user.id);
                
                if (!session) {
                    return interaction.update({ 
                        content: '❌ Your verification session has expired. Please try again.',
                        embeds: [],
                        components: []
                    });
                }
                
                // Verificar si la respuesta es correcta
                if (selectedAnswer === session.correctAnswer) {
                    const verifiedRole = interaction.guild.roles.cache.get(process.env.VERIFIED_ROLE_ID);
                    
                    try {
                        // Dar el rol de verificado
                        await interaction.member.roles.add(verifiedRole);
                        
                        // Guardar verificación en base de datos
                        await db.addVerification(interaction.user.id, interaction.user.tag);
                        
                        // Limpiar sesión
                        verificationSessions.delete(interaction.user.id);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor('#00D9A3')
                            .setTitle('✅ Verification Successful!')
                            .setDescription(`Welcome to the server, ${interaction.user}!\n\n🎉 You have successfully proven you're human!\n\nYou now have access to all channels.`)
                            .setFooter({ text: 'Enjoy your stay!' })
                            .setTimestamp();

                        await interaction.update({ 
                            embeds: [successEmbed], 
                            components: [],
                            ephemeral: true 
                        });

                        console.log(`✅ ${interaction.user.tag} has been verified (passed CAPTCHA)`);
                    } catch (error) {
                        console.error('Error giving verified role:', error);
                        await interaction.update({ 
                            content: '❌ There was an error verifying you. Please contact an administrator.',
                            embeds: [],
                            components: []
                        });
                    }
                } else {
                    // Respuesta incorrecta
                    verificationSessions.delete(interaction.user.id);
                    
                    const failEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('❌ Verification Failed')
                        .setDescription('**Incorrect answer!**\n\nPlease try again by clicking the verification button.')
                        .setFooter({ text: 'Make sure to solve the math problem correctly' })
                        .setTimestamp();

                    await interaction.update({ 
                        embeds: [failEmbed], 
                        components: []
                    });

                    console.log(`❌ ${interaction.user.tag} failed CAPTCHA verification`);
                }
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

