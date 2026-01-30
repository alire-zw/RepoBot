import { getPlansForServerAndCategory } from '../services/planService.js';
import { getPurchaseState, setPurchaseState } from '../services/purchaseState.js';
import {
  getPurchaseSelectPlanMessage,
  buildPurchasePlansKeyboard
} from '../helpers/purchaseHelpers.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'category' || !state.serverId) {
    try {
      await ctx.editMessageText('لطفاً از ابتدا سرور را انتخاب کنید.', backButton);
    } catch {
      await ctx.reply('لطفاً از ابتدا سرور را انتخاب کنید.', backButton);
    }
    return;
  }
  const match = ctx.callbackQuery?.data?.match(/^purchase_cat_(\d+)$/);
  if (!match) return;
  const categoryId = parseInt(match[1], 10);
  let plans = [];
  try {
    plans = await getPlansForServerAndCategory(state.serverId, categoryId);
  } catch (e) {
    console.error('purchaseCategory getPlansForServerAndCategory:', e);
    const errMsg = 'خطا در دریافت پلن‌ها. لطفاً دوباره انتخاب کنید.';
    try {
      await ctx.editMessageText(errMsg, backButton);
    } catch {
      await ctx.reply(errMsg, backButton);
    }
    return;
  }
  if (!plans || plans.length === 0) {
    const noMsg = 'پلنی با ظرفیت موجود یافت نشد.';
    try {
      await ctx.editMessageText(noMsg, backButton);
    } catch {
      await ctx.reply(noMsg, backButton);
    }
    return;
  }
  setPurchaseState(userId, { ...state, step: 'plan', categoryId });
  const text = getPurchaseSelectPlanMessage();
  const keyboard = buildPurchasePlansKeyboard(plans);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
