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

  try {
    const categories = await getAllCategories();
    const result = buildCategoriesListKeyboard(categories, 1, PER_PAGE);
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
    console.error('[categoryListHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست دسته‌بندی‌ها', show_alert: true });
  }
};
