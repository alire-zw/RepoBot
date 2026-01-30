import dotenv from 'dotenv';

dotenv.config();

const config = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  WEBHOOK: process.env.WEBHOOK,
  BOT_NAME: process.env.BOT_NAME || 'فیلترشکن',
  ADMINS: process.env.ADMINS ? process.env.ADMINS.split(',').map(id => id.trim()) : [],
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'resolverbot',
  DB_PORT: process.env.DB_PORT || 3306,
  CARD_NUMBER: process.env.CARD_NUMBER || '',
  CARD_NAME: process.env.CARD_NAME || '',
  REF_MONEY: parseInt(process.env.REF_MONEY) || 0,
  /** لینک پشتیبانی (مثلاً https://t.me/username یا tg://user?id=123) */
  SUPPORT_LINK: process.env.SUPPORT_LINK || '',
};

const requiredVars = ['BOT_TOKEN', 'WEBHOOK'];
const missingVars = requiredVars.filter(varName => !config[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file');
  process.exit(1);
}

export default config;

