import { findPlanById, deletePlan, getAllPlans } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getPlansListMessage, buildPlansListKeyboard } from '../helpers/planListHelpers.js';

const PER_PAGE = 8;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const planId = data?.startsWith('plan_delete_confirm_') ? parseInt(data.replace('plan_delete_confirm_', ''), 10) : null;
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

    await deletePlan(planId);
    await ctx.answerCbQuery({ text: `✅ پلن "${plan.name}" حذف شد`, show_alert: false });

    const plans = await getAllPlans();
    const result = buildPlansListKeyboard(plans, 1, PER_PAGE);
    const message = getPlansListMessage(result.currentPage, result.totalPages, result.totalPlans);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: result.inline_keyboard }
      });
    } catch (editErr) {
      if (!editErr.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: result.inline_keyboard }
        });
      }
    }
  } catch (error) {
    console.error('[planDeleteConfirmHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در حذف پلن', show_alert: true });
  }
};
