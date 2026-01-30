import { isAdmin } from '../services/admin.js';
import { setBotSettingsState } from '../services/botSettingsState.js';
import { getPvUsername } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const pvUsername = await getPvUsername();
  const requestMessageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  setBotSettingsState(userId, {
    step: 'waiting_pv_username',
    requestMessageId,
    chatId
  });

  const current = pvUsername ? `\n\nآیدی فعلی: @${pvUsername.replace(/^@/, '')}` : '';
  const message = `✏️ <b>تنظیم آیدی پیوی</b>

یوزرنیم تلگرام ادمین را برای واریز/پرداخت از طریق پیوی وارد کنید (با @ یا بدون @).${current}`;

  const keyboard = [[{ text: '🔙 انصراف', callback_data: 'bot_settings' }]];

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
}
