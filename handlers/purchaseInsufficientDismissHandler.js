import { getPurchaseState } from '../services/purchaseState.js';
import { getUserBalance } from '../services/walletService.js';
import {
  getPurchasePaymentMessage,
  buildPurchasePaymentKeyboard
} from '../helpers/purchaseHelpers.js';

/** بعد از زدن «متوجه شدم» در پیام کمبود موجودی، برگرد به مرحلهٔ پرداخت */
export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'payment' || !state.plan) {
    return;
  }
  const plan = state.plan;
  const balance = await getUserBalance(userId);
  const text = getPurchasePaymentMessage(plan, balance);
  const keyboard = buildPurchasePaymentKeyboard();
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
