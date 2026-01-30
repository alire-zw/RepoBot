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
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('category_delete_')) {
    categoryId = parseInt(data.replace('category_delete_', ''), 10);
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

    const message = `🗑️ <b>حذف دسته‌بندی</b>

<b>نام:</b> ${category.name}

⚠️ آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟`;

    const keyboard = [
      [
        { text: '✅ بله، حذف کن', callback_data: `category_delete_confirm_${categoryId}` },
        { text: '❌ خیر، لغو', callback_data: `category_detail_${categoryId}` }
      ]
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
    console.error('[categoryDeleteHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش تایید حذف', show_alert: true });
  }
};
