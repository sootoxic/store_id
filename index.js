
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const dataPath = './id_store_data.json';

// Load data
function loadData() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

// Save data
function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const [command, ...args] = message.content.trim().split(/\s+/);
  const data = loadData();

  if (command === 'عرض' && args[0]) {
    let category = args[0];
    if (data[category]) {
      if (data[category].length === 0) {
        message.reply(`📭 لا توجد أرقام في قسم ${category}`);
      } else {
        message.reply(`📦 ${category}:
` + data[category].join('\n'));
      }
    } else {
      message.reply('❌ نوع غير معروف. الأنواع: عادية، مميزة، مكررة، تم_بيعه');
    }
  }

  else if (command === 'تم' && args[0] === 'بيع' && args[1]) {
    const number = args[1];
    for (let cat of ['مميزة', 'مكررة']) {
      const index = data[cat].indexOf(number);
      if (index !== -1) {
        data[cat].splice(index, 1);
        data['تم_بيعه'].push(number);
        saveData(data);
        return message.reply(`✅ تم نقل الرقم ${number} إلى "تم_بيعه"`);
      }
    }
    message.reply('❌ الرقم غير موجود في مميزة أو مكررة');
  }

  else if (command === 'إضافة' && args.length === 2) {
    const [type, number] = args;
    if (data[type]) {
      if (data[type].includes(number)) {
        return message.reply('⚠️ الرقم موجود مسبقاً.');
      }
      data[type].push(number);
      saveData(data);
      message.reply(`✅ تمت إضافة الرقم ${number} إلى ${type}`);
    } else {
      message.reply('❌ نوع غير معروف.');
    }
  }

  else if (command === 'مسح' && args[0]) {
    const number = args[0];
    for (let cat in data) {
      const index = data[cat].indexOf(number);
      if (index !== -1) {
        data[cat].splice(index, 1);
        saveData(data);
        return message.reply(`🗑️ تم حذف الرقم ${number} من ${cat}`);
      }
    }
    message.reply('❌ لم يتم العثور على الرقم.');
  }
});

client.login(process.env.BOT_TOKEN);
