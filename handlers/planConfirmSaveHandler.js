import { getPlanAddState, clearPlanAddState } from '../services/planState.js';
import { createPlan } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getCategoriesManagementMessage } from '../helpers/categoryListHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const state = getPlanAddState(userId);
  if (!state || state.step !== 'confirm' || !state.data) {
    await ctx.answerCbQuery({ text: 'مرحله نامعتبر است', show_alert: true });
    return;
  }

  const data = state.data;
  const payload = {
    name: data.planName,
    volumeGB: data.volumeGB,
    durationDays: data.durationDays,
    categoryId: data.categoryId,
    serverId: data.serverId,
    inboundId: data.inboundId,
    inboundTag: data.inboundTag,
    capacityLimited: data.capacityLimited !== false,
    capacity: data.capacity ?? null,
    priceToman: data.priceToman
  };

  try {
    await createPlan(payload);
    clearPlanAddState(userId);
    await ctx.answerCbQuery({ text: `✅ پلن "${data.planName}" با موفقیت ذخیره شد`, show_alert: false });
  } catch (err) {
    console.error('[planConfirmSaveHandler] createPlan error:', err);
    await ctx.answerCbQuery({ text: 'خطا در ذخیره پلن', show_alert: true });
    return;
  }

  const message = `✅ پلن <b>${data.planName}</b> با موفقیت ذخیره شد.`;
  const keyboard = [
    [
      { text: '➕ افزودن پلن', callback_data: 'plan_add' },
      { text: '📋 مشاهده پلن‌ها', callback_data: 'plan_list' }
    ],
    [{ text: '🔙 بازگشت به دسته‌بندی و پلن‌ها', callback_data: 'category_management' }]
  ];

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
