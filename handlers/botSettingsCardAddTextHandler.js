import { isAdmin } from '../services/admin.js';
import { getBotSettingsState, setBotSettingsState, clearBotSettingsState } from '../services/botSettingsState.js';
import { addPaymentCard } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return false;

  const state = getBotSettingsState(userId);
  if (!state || (state.step !== 'waiting_card_name' && state.step !== 'waiting_card_number')) return false;

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

  try {
    if (state.step === 'waiting_card_name') {
      if (text.length > 255) {
        try {
          await ctx.deleteMessage();
        } catch (_) {}
        await editRequestMessage(
          `❌ نام کارت نباید بیشتر از ۲۵۵ کاراکتر باشد.\n\nلطفاً نام یا عنوان کارت را ارسال کنید:`,
          [[{ text: '🔙 انصراف', callback_data: 'bot_settings_cards_list' }]]
        );
        return true;
      }
      setBotSettingsState(userId, {
        ...state,
        step: 'waiting_card_number',
        cardName: text
      });
      try {
        await ctx.deleteMessage();
      } catch (_) {}
      const msg = `✅ نام ذخیره شد: <b>${text}</b>\n\nحالا <b>شماره کارت</b> (۱۶ رقم) را بدون فاصله ارسال کنید.`;
      await editRequestMessage(msg, [[{ text: '🔙 انصراف', callback_data: 'bot_settings_cards_list' }]]);
      return true;
    }

    if (state.step === 'waiting_card_number') {
      const digits = text.replace(/\s/g, '');
      if (!/^\d{16}$/.test(digits)) {
        try {
          await ctx.deleteMessage();
        } catch (_) {}
        await editRequestMessage(
          `❌ شماره کارت باید دقیقاً ۱۶ رقم باشد (بدون فاصله یا خط تیره).\n\nشماره کارت را ارسال کنید:`,
          [[{ text: '🔙 انصراف', callback_data: 'bot_settings_cards_list' }]]
        );
        return true;
      }
      await addPaymentCard(state.cardName || 'کارت', digits);
      clearBotSettingsState(userId);
      try {
        await ctx.deleteMessage();
      } catch (_) {}
      await editRequestMessage('✅ کارت با موفقیت اضافه شد.', [
        [{ text: '📋 بازگشت به لیست کارت‌ها', callback_data: 'bot_settings_cards_list' }]
      ]);
      return true;
    }
  } catch (err) {
    console.error('[botSettingsCardAddTextHandler]', err);
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    await editRequestMessage(
      '❌ خطا در ذخیره. لطفاً دوباره از تنظیمات ربات > لیست شماره کارت‌ها > افزودن کارت شروع کنید.',
      [[{ text: '🔙 انصراف', callback_data: 'bot_settings_cards_list' }]]
    );
    clearBotSettingsState(userId);
    return true;
  }
  return false;
}
