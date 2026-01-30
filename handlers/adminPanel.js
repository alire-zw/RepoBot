import { isAdmin } from '../services/admin.js';
import moment from 'moment-jalaali';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const now = moment().format('jYYYY/jMM/jDD ساعت HH:mm');

  const keyboard = [
    [
      { text: '📊 آمار کاربران', callback_data: 'admin_users_stats' },
      { text: '🔍 جستجوی کاربر', callback_data: 'admin_balance_search' }
    ],
    [
      { text: '🔒 مدیریت کانال‌ها', callback_data: 'channel_management' },
      { text: '🖥️ مدیریت سرورها', callback_data: 'server_management' }
    ],
    [
      { text: '📋 دسته‌بندی و پلن‌ها', callback_data: 'category_management' },
      { text: '⚙️ تنظیمات ربات', callback_data: 'bot_settings' }
    ],
    [
      { text: '🖥️ تنظیمات پنل و کانفیگ‌ها', callback_data: 'panel_settings' }
    ],
    [
      { text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }
    ]
  ];

  const message = `👑 <b>پنل ادمین</b>

شما می‌توانید ربات را از این بخش مدیریت کنید.

🕰 آخرین بروزرسانی: ${now}`;

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  } catch {
    await ctx.reply(message, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard
      }
    });
  }
};
