import { findCategoryById, deleteCategory, getAllCategories } from '../services/categoryService.js';
import { isAdmin } from '../services/admin.js';
import {
  getCategoriesListMessage,
  buildCategoriesListKeyboard
} from '../helpers/categoryListHelpers.js';

const PER_PAGE = 8;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let categoryId = null;
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('category_delete_confirm_')) {
    categoryId = parseInt(data.replace('category_delete_confirm_', ''), 10);
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

    await deleteCategory(categoryId);
    await ctx.answerCbQuery({ text: `✅ دسته‌بندی "${category.name}" حذف شد`, show_alert: false });

    const categories = await getAllCategories();
    const result = buildCategoriesListKeyboard(categories, 1, PER_PAGE);
    const message = getCategoriesListMessage(result.currentPage, result.totalPages, result.totalCategories);

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
    console.error('[categoryDeleteConfirmHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در حذف دسته‌بندی', show_alert: true });
  }
};
