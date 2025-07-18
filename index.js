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

const data = loadData();
const categoryChoices = Object.keys(data).map(key => ({ name: key, value: key })).slice(0, 25);

const commands = [
  new SlashCommandBuilder()
    .setName('عرض')
    .setDescription('📦 عرض الأرقام من نوع معين')
    .addStringOption(option =>
      option.setName('النوع')
        .setDescription('اختر النوع')
        .setRequired(true)
        .addChoices(...categoryChoices))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('إضافة')
    .setDescription('➕ إضافة رقم جديد لقسم معين')
    .addStringOption(option =>
      option.setName('النوع')
        .setDescription('اختر القسم')
        .setRequired(true)
        .addChoices(...categoryChoices))
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
    .toJSON(),

  new SlashCommandBuilder()
    .setName('نقل_الى_تم_بيعه')
    .setDescription('🔁 نقل رقم من أي فئة إلى تم_بيعه')
    .addStringOption(option =>
      option.setName('الرقم')
        .setDescription('الرقم المراد نقله')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('حذف')
    .setDescription('❌ حذف رقم من أي فئة بدون تسجيله في تم_بيعه')
    .addStringOption(option =>
      option.setName('الرقم')
        .setDescription('الرقم المراد حذفه')
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
    return interaction.reply({ content: '🚫 ليس لديك الصلاحية لاستخدام هذا البوت.', flags: 64 });
  }

  const data = loadData();

  const number = interaction.options.getString('الرقم');
  const type = interaction.options.getString('النوع');

  if (interaction.commandName === 'عرض') {
    if (!data[type]) return interaction.reply({ content: '❌ النوع غير معروف.', flags: 64 });
    if (data[type].length === 0) {
      return interaction.reply({ content: `📭 لا يوجد أرقام في قسم ${type}`, flags: 64 });
    }
    const list = data[type];

    // إذا أكثر من 100 → أرسل ملف .txt
    if (list.length > 100) {
      const fileContent = list.map((n, i) => `${i + 1}. ${n}`).join('\n');
      const fileName = `${type.replace(/ /g, '_')}.txt`;
      fs.writeFileSync(fileName, fileContent);
      const attachment = new AttachmentBuilder(fileName);
      try {
        await interaction.user.send({ content: `📁 قائمة ${type}:`, files: [attachment] });
        return interaction.reply({ content: '📨 تم إرسال القائمة في الخاص كملف.', flags: 64 });
      } catch {
        return interaction.reply({ content: '❌ لا يمكن إرسال رسالة خاصة لك. تأكد من فتح الخاص.', flags: 64 });
      }
    } else {
      const msg = `📦 **${type}**:\n` + list.map((n, i) => `${i + 1}. ${n}`).join('\n');
      try {
        await interaction.user.send(msg);
        return interaction.reply({ content: '📨 تم إرسال القائمة في الخاص.', flags: 64 });
      } catch {
        return interaction.reply({ content: '❌ لا يمكن إرسال رسالة خاصة لك. تأكد من فتح الخاص.', flags: 64 });
      }
    }

  } else if (interaction.commandName === 'إضافة') {
    if (!data[type]) return interaction.reply({ content: '❌ النوع غير معروف.', flags: 64 });
    if (data[type].includes(Number(number))) return interaction.reply({ content: '⚠️ الرقم موجود مسبقاً.', flags: 64 });
    data[type].push(Number(number));
    saveData(data);
    return interaction.reply({ content: `✅ تمت إضافة الرقم ${number} إلى ${type}`, flags: 64 });

  } else if (interaction.commandName === 'بيع') {
    for (let cat of Object.keys(data)) {
      const index = data[cat]?.indexOf(Number(number));
      if (index !== -1) {
        data[cat].splice(index, 1);
        data['تم_بيعه'].push(Number(number));
        saveData(data);
        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sold_ok')
            .setLabel('✅ تم البيع')
            .setStyle(ButtonStyle.Success)
            .setDisabled(true)
        );
        await interaction.reply({ content: `✅ تم بيع الرقم ${number}`, components: [btnRow] });
        await notifyStoreManager(interaction.guild, `📢 تم بيع الرقم ${number} بواسطة <@${interaction.user.id}>`);
        return;
      }
    }
    return interaction.reply({ content: '❌ الرقم غير موجود في أي قائمة.', flags: 64 });

  } else if (interaction.commandName === 'نقل_الى_تم_بيعه') {
    for (let cat of Object.keys(data)) {
      const index = data[cat]?.indexOf(Number(number));
      if (index !== -1) {
        data[cat].splice(index, 1);
        data['تم_بيعه'].push(Number(number));
        saveData(data);
        return interaction.reply({ content: `✅ تم نقل الرقم ${number} إلى تم_بيعه.`, flags: 64 });
      }
    }
    return interaction.reply({ content: '❌ الرقم غير موجود.', flags: 64 });

  } else if (interaction.commandName === 'حذف') {
    for (let cat of Object.keys(data)) {
      const index = data[cat]?.indexOf(Number(number));
      if (index !== -1) {
        data[cat].splice(index, 1);
        saveData(data);
        return interaction.reply({ content: `✅ تم حذف الرقم ${number} من قسم ${cat}.`, flags: 64 });
      }
    }
    return interaction.reply({ content: '❌ الرقم غير موجود.', flags: 64 });
  }
});

client.login(process.env.BOT_TOKEN);
