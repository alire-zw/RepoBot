import { getCategoriesWithPlansForServer } from '../services/planService.js';
import { setPurchaseState } from '../services/purchaseState.js';
import {
  getPurchaseSelectCategoryMessage,
  buildPurchaseCategoriesKeyboard
} from '../helpers/purchaseHelpers.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const match = ctx.callbackQuery?.data?.match(/^purchase_server_(\d+)$/);
  if (!match) return;
  const serverId = parseInt(match[1], 10);
  let categories = [];
  try {
    categories = await getCategoriesWithPlansForServer(serverId);
  } catch (e) {
    console.error('purchaseServer getCategoriesWithPlansForServer:', e);
    const errMsg = 'خطا در دریافت دسته‌بندی‌ها. لطفاً دوباره انتخاب کنید.';
    try {
      await ctx.editMessageText(errMsg, backButton);
    } catch {
      await ctx.reply(errMsg, backButton);
    }
    return;
  }
  if (!categories || categories.length === 0) {
    const noMsg = 'برای این سرور دسته‌بندی با پلن موجود یافت نشد.';
    try {
      await ctx.editMessageText(noMsg, backButton);
    } catch {
      await ctx.reply(noMsg, backButton);
    }
    return;
  }
  setPurchaseState(userId, { step: 'category', serverId });
  const text = getPurchaseSelectCategoryMessage();
  const keyboard = buildPurchaseCategoriesKeyboard(categories);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
