import { findPlanById } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { setPlanEditState } from '../services/planState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const planId = data?.startsWith('plan_edit_duration_') ? parseInt(data.replace('plan_edit_duration_', ''), 10) : null;
  if (!planId || isNaN(planId)) {
    await ctx.answerCbQuery({ text: 'پلن نامعتبر است', show_alert: true });
    return;
  }

  const plan = await findPlanById(planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }

  setPlanEditState(userId, {
    planId,
    field: 'durationDays',
    chatId: ctx.chat?.id,
    requestMessageId: ctx.callbackQuery?.message?.message_id
  });

  const message = `✏️ <b>ویرایش مدت (روز)</b>\n\nمدت فعلی: <b>${plan.durationDays}</b> روز\n\nعدد جدید را وارد کنید:`;
  const keyboard = [[{ text: '🔙 انصراف', callback_data: `plan_detail_${planId}` }]];

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
