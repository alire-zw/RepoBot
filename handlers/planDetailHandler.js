import { findPlanById } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getPlanDetailKeyboard, getPlanDetailMessage } from '../helpers/planDetailHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let planId = null;
  const data = ctx.callbackQuery?.data;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    planId = parseInt(ctx.match[1], 10);
  } else if (data && data.startsWith('plan_detail_')) {
    planId = parseInt(data.replace('plan_detail_', ''), 10);
  }
  if (!planId || isNaN(planId)) {
    await ctx.answerCbQuery({ text: 'آیدی پلن نامعتبر است', show_alert: true });
    return;
  }

  try {
    const plan = await findPlanById(planId);
    if (!plan) {
      await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
      return;
    }

    const keyboard = getPlanDetailKeyboard(plan, planId);
    const message = getPlanDetailMessage(plan);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (e) {
      if (!e.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    }
  } catch (error) {
    console.error('[planDetailHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش جزئیات پلن', show_alert: true });
  }
};
