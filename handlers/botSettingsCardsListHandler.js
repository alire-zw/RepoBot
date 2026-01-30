import { isAdmin } from '../services/admin.js';
import { getPaymentCards } from '../services/paymentSettingsService.js';
import { clearBotSettingsState } from '../services/botSettingsState.js';

const BUTTON_TEXT_MAX = 28;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  clearBotSettingsState(userId);

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const cards = await getPaymentCards();

  const message = `📋 <b>لیست شماره کارت‌ها</b>

برای واریز و پرداخت کارت به کارت از یکی از کارت‌های زیر استفاده می‌شود. می‌توانید کارت جدید اضافه کنید یا کارت‌های قبلی را حذف کنید.

تعداد: ${cards.length} کارت`;

  const keyboard = [];
  for (const c of cards) {
    const label = (c.name || '').length > BUTTON_TEXT_MAX
      ? (c.name || '').substring(0, BUTTON_TEXT_MAX - 1) + '…'
      : (c.name || 'کارت ' + c.id);
    keyboard.push([
      { text: label, callback_data: `bot_settings_card_info_${c.id}` },
      { text: '🗑️', callback_data: `bot_settings_card_delete_${c.id}` }
    ]);
  }
  keyboard.push([{ text: '➕ افزودن کارت', callback_data: 'bot_settings_card_add' }]);
  keyboard.push([{ text: '🔙 بازگشت', callback_data: 'bot_settings' }]);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
}
