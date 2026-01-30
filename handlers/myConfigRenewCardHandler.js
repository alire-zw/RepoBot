import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import { setPurchaseState } from '../services/purchaseState.js';
import { getPurchaseCardMessage, getPurchasePvMessage } from '../helpers/purchaseHelpers.js';
import { buildPvPaymentKeyboard } from '../helpers/paymentHelpers.js';
import { getPaymentMethod, getPvUsername, getOneCardForPayment } from '../services/paymentSettingsService.js';

export default async function myConfigRenewCardHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('myconfig_renew_card_')) return;
  const subId = parseInt(data.replace('myconfig_renew_card_', ''), 10);
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

  const keyboard = {
    inline_keyboard: [[{ text: '🔙 انصراف', callback_data: `myconfig_detail_${subId}` }]]
  };

  const method = await getPaymentMethod();
  if (method === 'pvid') {
    const pvUsername = await getPvUsername();
    const text = getPurchasePvMessage(plan) + '\n\n🔄 این پرداخت برای <b>تمدید</b> اشتراک شماست.';
    const pvKeyboard = buildPvPaymentKeyboard(pvUsername, '🔙 انصراف', `myconfig_detail_${subId}`);
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: pvKeyboard });
    } catch {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: pvKeyboard });
    }
    return;
  }

  const card = await getOneCardForPayment();
  if (!card) {
    await ctx.answerCbQuery({ text: 'در حال حاضر پرداخت کارت به کارت غیرفعال است.', show_alert: true });
    return;
  }

  const requestMessageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  setPurchaseState(userId, {
    step: 'waiting_plan_order_receipt',
    planId: plan.id,
    plan,
    renewalSubId: subId,
    requestMessageId,
    chatId
  });

  const text = getPurchaseCardMessage(plan, card.cardNumber, card.name) + '\n\n🔄 این پرداخت برای <b>تمدید</b> اشتراک شماست.';

  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
