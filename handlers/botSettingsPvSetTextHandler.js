import { isAdmin } from '../services/admin.js';
import { getBotSettingsState, clearBotSettingsState } from '../services/botSettingsState.js';
import { setPvUsername } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return false;

  const state = getBotSettingsState(userId);
  if (!state || state.step !== 'waiting_pv_username') return false;

  const text = (ctx.message?.text || '').trim();
  if (!text) return false;

  const username = text.replace(/^@/, '').trim();
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

  if (!username || username.length > 255) {
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    await editRequestMessage(
      '❌ یوزرنیم معتبر وارد کنید (حداکثر ۲۵۵ کاراکتر).\n\nیوزرنیم تلگرام ادمین را ارسال کنید:',
      [[{ text: '🔙 انصراف', callback_data: 'bot_settings' }]]
    );
    return true;
  }

  await setPvUsername(username);
  clearBotSettingsState(userId);
  try {
    await ctx.deleteMessage();
  } catch (_) {}

  await editRequestMessage(`✅ آیدی پیوی ذخیره شد: @${username}`, [
    [{ text: '🔙 بازگشت به تنظیمات ربات', callback_data: 'bot_settings' }]
  ]);
  return true;
}
