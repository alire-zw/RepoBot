import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const message = `🔒 <b>مدیریت کانال‌ها</b>

در این بخش می‌توانید کانال‌ها را مدیریت کنید.`;

    const keyboard = [
      [
        { text: '➕ افزودن کانال', callback_data: 'channel_add' },
        { text: '📋 مشاهده کانال‌ها', callback_data: 'channel_list' }
      ],
      [
        { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
      ]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        console.log('[channelsManagementHandler] Message not modified');
      } else {
        console.error('[channelsManagementHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelsManagementHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش مدیریت کانال‌ها', show_alert: true });
  }
};

