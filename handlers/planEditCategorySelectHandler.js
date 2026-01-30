import { findPlanById, updatePlan } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { clearPlanEditState } from '../services/planState.js';
import { getPlanDetailKeyboard, getPlanDetailMessage } from '../helpers/planDetailHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('plan_edit_category_select_')) return;
  const parts = data.replace('plan_edit_category_select_', '').split('_');
  const planId = parseInt(parts[0], 10);
  const categoryId = parseInt(parts[1], 10);
  if (!planId || isNaN(planId) || !categoryId || isNaN(categoryId)) {
    await ctx.answerCbQuery({ text: 'داده نامعتبر است', show_alert: true });
    return;
  }

  try {
    await updatePlan(planId, { categoryId });
    clearPlanEditState(userId);
    const plan = await findPlanById(planId);
    if (!plan) {
      await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
      return;
    }
    const keyboard = getPlanDetailKeyboard(plan, planId);
    const message = getPlanDetailMessage(plan);
    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      if (!e.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    }
  } catch (err) {
    console.error('[planEditCategorySelectHandler] Error:', err);
    await ctx.answerCbQuery({ text: 'خطا در بروزرسانی', show_alert: true });
  }
};
