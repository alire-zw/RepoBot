import { findPlanById, updatePlan } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getPlanEditState, clearPlanEditState } from '../services/planState.js';
import { getPlanDetailKeyboard, getPlanDetailMessage } from '../helpers/planDetailHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('plan_edit_inbound_select_')) return;
  const parts = data.replace('plan_edit_inbound_select_', '').split('_');
  const planId = parseInt(parts[0], 10);
  const serverId = parseInt(parts[1], 10);
  const index = parseInt(parts[2], 10);
  if (!planId || isNaN(planId) || !serverId || isNaN(serverId) || isNaN(index)) {
    await ctx.answerCbQuery({ text: 'داده نامعتبر است', show_alert: true });
    return;
  }

  const state = getPlanEditState(userId);
  const inbounds = state?._inboundsCache;
  if (!Array.isArray(inbounds) || !inbounds[index]) {
    await ctx.answerCbQuery({ text: 'لیست اینباند منقضی شده. دوباره سرور را انتخاب کنید.', show_alert: true });
    return;
  }

  const inbound = inbounds[index];
  const inboundId = inbound.id != null ? String(inbound.id) : String(index);
  const inboundTag = inbound.tag || inbound.protocol || `inbound-${index}`;

  try {
    await updatePlan(planId, { serverId, inboundId, inboundTag });
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
    console.error('[planEditInboundSelectHandler] Error:', err);
    await ctx.answerCbQuery({ text: 'خطا در بروزرسانی', show_alert: true });
  }
};
