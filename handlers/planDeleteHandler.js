import { findPlanById } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const planId = data?.startsWith('plan_delete_') ? parseInt(data.replace('plan_delete_', ''), 10) : null;
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

    const message = `🗑️ <b>حذف پلن</b>

<b>نام:</b> ${plan.name}
<b>حجم:</b> ${plan.volumeGB} GB
<b>مدت:</b> ${plan.durationDays} روز
<b>قیمت:</b> ${Number(plan.priceToman).toLocaleString('fa-IR', { numberingSystem: 'latn' })} تومان

⚠️ آیا مطمئن هستید که می‌خواهید این پلن را حذف کنید؟`;

    const keyboard = [
      [
        { text: '✅ بله، حذف کن', callback_data: `plan_delete_confirm_${planId}` },
        { text: '❌ خیر، لغو', callback_data: `plan_detail_${planId}` }
      ]
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
  } catch (error) {
    console.error('[planDeleteHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش تایید حذف', show_alert: true });
  }
};
