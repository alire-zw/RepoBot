import { findCategoryById } from '../services/categoryService.js';
import { isAdmin } from '../services/admin.js';
import { setCategoryState } from '../services/categoryState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let categoryId = null;
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('category_edit_')) {
    categoryId = parseInt(data.replace('category_edit_', ''), 10);
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

    setCategoryState(userId, {
      mode: 'editing',
      categoryId,
      chatId: ctx.chat?.id,
      requestMessageId: ctx.callbackQuery?.message?.message_id
    });

    const message = `✏️ <b>ویرایش دسته‌بندی</b>

<b>نام فعلی:</b> ${category.name}

لطفاً نام جدید را وارد کنید:`;

    const keyboard = [
      [{ text: '🔙 انصراف', callback_data: `category_detail_${categoryId}` }]
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
    console.error('[categoryEditHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در شروع ویرایش', show_alert: true });
  }
};
