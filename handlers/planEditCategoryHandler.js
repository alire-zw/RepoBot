import { findPlanById } from '../services/planService.js';
import { getAllCategories } from '../services/categoryService.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const planId = data?.startsWith('plan_edit_category_') ? parseInt(data.replace('plan_edit_category_', ''), 10) : null;
  if (!planId || isNaN(planId)) {
    await ctx.answerCbQuery({ text: 'پلن نامعتبر است', show_alert: true });
    return;
  }

  const plan = await findPlanById(planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }

  const categories = await getAllCategories();
  if (categories.length === 0) {
    await ctx.answerCbQuery({ text: 'هیچ دسته‌بندی ثبت نشده است', show_alert: true });
    return;
  }

  const keyboard = categories.map((c) => [
    { text: (c.name || '').substring(0, 20), callback_data: `plan_edit_category_select_${planId}_${c.id}` }
  ]);
  keyboard.push([{ text: '🔙 انصراف', callback_data: `plan_detail_${planId}` }]);

  const message = `✏️ <b>ویرایش دسته‌بندی</b>\n\nدسته‌بندی جدید را انتخاب کنید:`;

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
