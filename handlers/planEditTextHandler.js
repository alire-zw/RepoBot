import { getPlanEditState, clearPlanEditState } from '../services/planState.js';
import { findPlanById, updatePlan } from '../services/planService.js';
import { getPlanDetailKeyboard, getPlanDetailMessage } from '../helpers/planDetailHelpers.js';

async function refreshPlanDetail(ctx, planId, chatId, messageId) {
  const plan = await findPlanById(planId);
  if (!plan) return;
  const keyboard = getPlanDetailKeyboard(plan, planId);
  const message = getPlanDetailMessage(plan);
  try {
    if (chatId && messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, null, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  }
}

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const state = getPlanEditState(userId);
  if (!state || !state.planId || !state.field) return false;

  const text = (ctx.message?.text || '').trim();
  const { planId, field, chatId, requestMessageId } = state;

  try {
    if (ctx.message?.message_id != null && ctx.chat?.id != null) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
  } catch (e) {}

  if (field === 'name') {
    if (!text) {
      await ctx.reply('❌ نام پلن نمی‌تواند خالی باشد.');
      return true;
    }
    if (text.length > 255) {
      await ctx.reply('❌ نام حداکثر ۲۵۵ کاراکتر است.');
      return true;
    }
    await updatePlan(planId, { name: text });
    clearPlanEditState(userId);
    await refreshPlanDetail(ctx, planId, chatId, requestMessageId);
    return true;
  }

  if (field === 'volumeGB') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply('❌ لطفاً یک عدد مثبت وارد کنید.');
      return true;
    }
    await updatePlan(planId, { volumeGB: num });
    clearPlanEditState(userId);
    await refreshPlanDetail(ctx, planId, chatId, requestMessageId);
    return true;
  }

  if (field === 'durationDays') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply('❌ لطفاً یک عدد مثبت وارد کنید.');
      return true;
    }
    await updatePlan(planId, { durationDays: num });
    clearPlanEditState(userId);
    await refreshPlanDetail(ctx, planId, chatId, requestMessageId);
    return true;
  }

  if (field === 'capacity') {
    const isUnlimited = text === '-' || text.toLowerCase() === 'نامحدود';
    if (isUnlimited) {
      await updatePlan(planId, { capacityLimited: false, capacity: null });
    } else {
      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1) {
        await ctx.reply('❌ برای محدود عدد مثبت و برای نامحدود «-» بفرستید.');
        return true;
      }
      await updatePlan(planId, { capacityLimited: true, capacity: num });
    }
    clearPlanEditState(userId);
    await refreshPlanDetail(ctx, planId, chatId, requestMessageId);
    return true;
  }

  if (field === 'priceToman') {
    const num = parseInt(String(text).replace(/,/g, ''), 10);
    if (isNaN(num) || num < 0) {
      await ctx.reply('❌ لطفاً یک عدد معتبر (قیمت به تومان) وارد کنید.');
      return true;
    }
    await updatePlan(planId, { priceToman: num });
    clearPlanEditState(userId);
    await refreshPlanDetail(ctx, planId, chatId, requestMessageId);
    return true;
  }

  return false;
};
