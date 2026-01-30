import { isAdmin } from '../services/admin.js';
import { getBotSettingsState, clearBotSettingsState } from '../services/botSettingsState.js';
import { setSupportLink } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return false;

  const state = getBotSettingsState(userId);
  if (!state || state.step !== 'waiting_support_link') return false;

  const text = (ctx.message?.text || '').trim();
  if (!text) return false;

  const chatId = state.chatId ?? ctx.chat?.id;
  const requestMessageId = state.requestMessageId;

  const editRequestMessage = async (message, keyboard) => {
    if (chatId && requestMessageId) {
      try {
        await ctx.telegram.editMessageText(chatId, requestMessageId, null, message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (e) {
        if (!e.description?.includes('message is not modified')) {
          await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
        }
      }
    } else {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  };

  if (text.length > 512) {
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    await editRequestMessage(
      '❌ لینک نباید بیشتر از ۵۱۲ کاراکتر باشد.',
      [[{ text: '🔙 انصراف', callback_data: 'bot_settings' }]]
    );
    return true;
  }

  await setSupportLink(text);
  clearBotSettingsState(userId);
  try {
    await ctx.deleteMessage();
  } catch (_) {}

  await editRequestMessage(`✅ لینک پشتیبانی ذخیره شد.\n\n<code>${text.replace(/</g, '&lt;')}</code>`, [
    [{ text: '🔙 بازگشت به تنظیمات ربات', callback_data: 'bot_settings' }]
  ]);
  return true;
};
