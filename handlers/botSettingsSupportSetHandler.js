import { isAdmin } from '../services/admin.js';
import { setBotSettingsState } from '../services/botSettingsState.js';
import { getSupportLink } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const supportLink = await getSupportLink();
  const requestMessageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  setBotSettingsState(userId, {
    step: 'waiting_support_link',
    requestMessageId,
    chatId
  });

  const current = supportLink ? `\n\nلینک فعلی: ${supportLink}` : '';
  const message = `✏️ <b>لینک پشتیبانی</b>

لینک یا آیدی پشتیبانی را وارد کنید. این لینک روی دکمهٔ «پشتیبانی» زیر پیام تحویل اشتراک نمایش داده می‌شود.
مثال: <code>https://t.me/username</code> یا <code>tg://user?id=123456</code>${current}`;

  const keyboard = [[{ text: '🔙 انصراف', callback_data: 'bot_settings' }]];

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
};
