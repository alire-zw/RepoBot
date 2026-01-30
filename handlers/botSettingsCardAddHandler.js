import { isAdmin } from '../services/admin.js';
import { setBotSettingsState } from '../services/botSettingsState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const requestMessageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  setBotSettingsState(userId, {
    step: 'waiting_card_name',
    requestMessageId,
    chatId
  });

  const message = `➕ <b>افزودن کارت</b>

لطفاً <b>نام یا عنوان</b> کارت را ارسال کنید (مثلاً: کارت بانک ملی، دامبیز).

این نام فقط برای تشخیص در پنل ادمین است.`;

  const keyboard = [[{ text: '🔙 انصراف', callback_data: 'bot_settings_cards_list' }]];

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
}
