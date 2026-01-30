import { isAdmin } from '../services/admin.js';
import { getPool } from '../services/database.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const match = data?.match(/^bot_settings_card_info_(\d+)$/);
  if (!match) return;

  const cardId = parseInt(match[1], 10);
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, name, cardNumber FROM payment_cards WHERE id = ? LIMIT 1',
    [cardId]
  );
  const card = rows[0];
  if (!card) {
    await ctx.answerCbQuery({ text: 'کارت یافت نشد', show_alert: true });
    return;
  }

  const message = `💳 <b>${card.name}</b>\n\nشماره کارت: <code>${card.cardNumber}</code>`;
  const keyboard = [[{ text: '🔙 بازگشت به لیست', callback_data: 'bot_settings_cards_list' }]];

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
