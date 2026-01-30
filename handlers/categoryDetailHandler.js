import { findCategoryById } from '../services/categoryService.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let categoryId = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    categoryId = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith('category_detail_')) {
      categoryId = parseInt(data.replace('category_detail_', ''), 10);
    }
  }

  if (!categoryId || isNaN(categoryId)) {
    await ctx.answerCbQuery({ text: 'آیدی دسته‌بندی نامعتبر است', show_alert: true });
    return;
  }

  try {
    const category = await findCategoryById(categoryId);
    if (!category) {
      await ctx.answerCbQuery({ text: 'دسته‌بندی یافت نشد', show_alert: true });
      return;
    }

    const message = `<b>جزئیات دسته‌بندی</b>

<b>نام:</b> ${category.name}
<b>شناسه:</b> ${category.id}`;

    const keyboard = [
      [{ text: '✏️ ویرایش نام', callback_data: `category_edit_${categoryId}` }],
      [{ text: '🗑️ حذف دسته‌بندی', callback_data: `category_delete_${categoryId}` }],
      [{ text: '🔙 بازگشت به لیست دسته‌بندی‌ها', callback_data: 'category_list' }]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    }
  } catch (error) {
    console.error('[categoryDetailHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش جزئیات دسته‌بندی', show_alert: true });
  }
};
