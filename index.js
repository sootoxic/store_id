
const { 
  Client, GatewayIntentBits, Partials, REST, Routes, 
  SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle 
} = require('discord.js');
require('dotenv').config();
const fs = require('fs');

const dataPath = './id_store_data.json';
const allowedRoles = [
  "1384560249817792655",
  "1384560041721466900",
  "1384559998423662675",
  "1384559615399690340"
];

function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}
async function notifyStoreManager(guild, message) {
  for (const roleId of allowedRoles) {
    const role = await guild.roles.fetch(roleId).catch(() => {});
    if (!role) continue;

    const members = role.members;
    if (members && members.size > 0) {
      const firstManager = members.first();
      if (firstManager) {
        try {
          await firstManager.send(message);
        } catch {}
        break;
      }
    }
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

const commands = [
  new SlashCommandBuilder()
    .setName('عرض')
    .setDescription('📦 عرض الأرقام من نوع معين')
    .addStringOption(option =>
      option.setName('النوع')
        .setDescription('اختر النوع')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('إضافة')
    .setDescription('➕ إضافة رقم جديد لقسم معين')
    .addStringOption(option =>
      option.setName('النوع')
        .setDescription('اختر القسم')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('الرقم')
        .setDescription('الرقم المراد إضافته')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('بيع')
    .setDescription('🛒 بيع رقم محدد')
    .addStringOption(option =>
      option.setName('الرقم')
        .setDescription('الرقم المراد بيعه')
        .setRequired(true))
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commands })
  .then(() => console.log('✅ Slash commands registered'))
  .catch(console.error);

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasPermission = allowedRoles.some(r => member.roles.cache.has(r));

  if (!hasPermission) {
    return interaction.reply({ content: '🚫 ليس لديك الصلاحية لاستخدام هذا البوت.', ephemeral: true });
  }

  const data = loadData();

  if (interaction.commandName === 'عرض') {
    const category = interaction.options.getString('النوع');
    if (!data[category]) return interaction.reply({ content: '❌ النوع غير معروف.', ephemeral: true });

    if (data[category].length === 0) {
      return interaction.reply({ content: `📭 لا يوجد أرقام في قسم ${category}`, ephemeral: true });
    }

    const list = data[category];
    const msg = `📦 ${category}:
` + list.map((n, i) => `${i + 1}. ${n}`).join('\n');
    return interaction.reply({ content: msg, ephemeral: true });

  } else if (interaction.commandName === 'إضافة') {
    const type = interaction.options.getString('النوع');
    const number = interaction.options.getString('الرقم');

    if (!data[type]) return interaction.reply({ content: '❌ النوع غير معروف.', ephemeral: true });
    if (data[type].includes(Number(number))) return interaction.reply({ content: '⚠️ الرقم موجود مسبقاً.', ephemeral: true });

    data[type].push(Number(number));
    saveData(data);
    return interaction.reply({ content: `✅ تمت إضافة الرقم ${number} إلى ${type}`, ephemeral: true });

  } else if (interaction.commandName === 'بيع') {
    const number = Number(interaction.options.getString('الرقم'));

    for (let cat of Object.keys(data)) {
      const index = data[cat]?.indexOf(number);
      if (index !== -1) {
        data[cat].splice(index, 1);
        data['تم_بيعه'].push(number);
        saveData(data);

        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sold_ok')
            .setLabel('✅ تم البيع')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );

        await interaction.reply({ content: `✅ تم بيع الرقم ${number}`, components: [btnRow], ephemeral: false });

        await notifyStoreManager(interaction.guild, `📢 تم بيع الرقم ${number} بواسطة <@${interaction.user.id}>`);

        return;
      }
    }

    return interaction.reply({ content: '❌ الرقم غير موجود في أي قائمة.', ephemeral: true });
  }
});

client.login(process.env.BOT_TOKEN);
