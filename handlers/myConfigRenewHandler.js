import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import { getMyConfigDetailMessage, buildMyConfigDetailKeyboard } from '../helpers/myConfigHelpers.js';

export default async function myConfigRenewHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('myconfig_renew_')) return;
  const subId = parseInt(data.replace('myconfig_renew_', ''), 10);
  if (!subId || isNaN(subId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const sub = await getSubscriptionById(subId);
  if (!sub || Number(sub.userID) !== Number(userId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const plan = await findPlanById(sub.planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }

  const priceStr = (plan.priceToman || 0).toLocaleString('en-US');
  const message = `🔄 <b>تمدید اشتراک</b>

📌 <b>اشتراک:</b> ${sub.planName || sub.clientEmail}
📦 حجم اضافه: <b>${plan.volumeGB}</b> گیگ
📅 مدت اضافه: <b>${plan.durationDays}</b> روز
💰 مبلغ: <b>${priceStr}</b> تومان

روش پرداخت را انتخاب کنید:`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💰 پرداخت با کیف پول', callback_data: `myconfig_renew_wallet_${subId}` },
        { text: '💳 کارت به کارت', callback_data: `myconfig_renew_card_${subId}` }
      ],
      [{ text: '🔙 بازگشت', callback_data: `myconfig_detail_${subId}` }]
    ]
  };

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
