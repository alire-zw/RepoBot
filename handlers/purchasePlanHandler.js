import { findPlanById } from '../services/planService.js';
import { getPurchaseState, setPurchaseState } from '../services/purchaseState.js';
import { getUserBalance } from '../services/walletService.js';
import {
  getPurchasePaymentMessage,
  buildPurchasePaymentKeyboard
} from '../helpers/purchaseHelpers.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'plan' || !state.serverId || !state.categoryId) {
    try {
      await ctx.editMessageText('لطفاً از ابتدا مراحل را انجام دهید.', backButton);
    } catch {
      await ctx.reply('لطفاً از ابتدا مراحل را انجام دهید.', backButton);
    }
    return;
  }
  const match = ctx.callbackQuery?.data?.match(/^purchase_plan_(\d+)$/);
  if (!match) return;
  const planId = parseInt(match[1], 10);
  let plan = null;
  try {
    plan = await findPlanById(planId);
  } catch (e) {
    console.error('purchasePlan findPlanById:', e);
    const errMsg = 'خطا در دریافت اطلاعات پلن.';
    try {
      await ctx.editMessageText(errMsg, backButton);
    } catch {
      await ctx.reply(errMsg, backButton);
    }
    return;
  }
  if (!plan || plan.serverId !== state.serverId || plan.categoryId !== state.categoryId) {
    try {
      await ctx.editMessageText('پلن انتخاب‌شده معتبر نیست.', backButton);
    } catch {
      await ctx.reply('پلن انتخاب‌شده معتبر نیست.', backButton);
    }
    return;
  }
  setPurchaseState(userId, { ...state, step: 'payment', planId, plan });
  const balance = await getUserBalance(userId);
  const text = getPurchasePaymentMessage(plan, balance);
  const keyboard = buildPurchasePaymentKeyboard();
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
