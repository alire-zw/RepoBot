import { getAllCategories } from '../services/categoryService.js';
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

  let page = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    page = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (!data || !data.startsWith('category_list_page_')) return;
    page = parseInt(data.replace('category_list_page_', ''), 10);
  }
  if (!page || isNaN(page) || page < 1) {
    await ctx.answerCbQuery({ text: 'صفحه نامعتبر است', show_alert: true });
    return;
  }

  try {
    const categories = await getAllCategories();
    const totalPagesComputed = Math.ceil(categories.length / PER_PAGE) || 1;
    const validPage = Math.max(1, Math.min(page, totalPagesComputed));

    const result = buildCategoriesListKeyboard(categories, validPage, PER_PAGE);
    const { inline_keyboard, currentPage, totalPages, totalCategories } = result;
    const message = getCategoriesListMessage(currentPage, totalPages, totalCategories);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard }
      });
    } catch (error) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard }
        });
      }
    }
  } catch (error) {
    console.error('[categoryListPageHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست دسته‌بندی‌ها', show_alert: true });
  }
};
