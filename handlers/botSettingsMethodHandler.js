import { isAdmin } from '../services/admin.js';
import { setPaymentMethod } from '../services/paymentSettingsService.js';
import botSettingsHandler from './botSettingsHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (data === 'bot_settings_method_card') {
    await setPaymentMethod('card');
  } else if (data === 'bot_settings_method_pvid') {
    await setPaymentMethod('pvid');
  } else {
    return;
  }

  await botSettingsHandler(ctx);
}
