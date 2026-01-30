import { isAdmin } from '../services/admin.js';
import { deletePaymentCard } from '../services/paymentSettingsService.js';
import botSettingsCardsListHandler from './botSettingsCardsListHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const match = data?.match(/^bot_settings_card_delete_(\d+)$/);
  if (!match) return;

  const cardId = parseInt(match[1], 10);
  const deleted = await deletePaymentCard(cardId);

  if (deleted) {
    await ctx.answerCbQuery({ text: 'کارت حذف شد', show_alert: false });
  }

  await botSettingsCardsListHandler(ctx);
}
