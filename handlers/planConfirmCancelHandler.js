import { getPlanAddState, clearPlanAddState } from '../services/planState.js';
import { isAdmin } from '../services/admin.js';
import { getCategoriesManagementMessage } from '../helpers/categoryListHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  clearPlanAddState(userId);

  const message = getCategoriesManagementMessage();
  const keyboard = [
    [
      { text: '➕ افزودن دسته‌بندی', callback_data: 'category_add' },
      { text: '📋 مشاهده دسته‌بندی‌ها', callback_data: 'category_list' }
    ],
    [
      { text: '➕ افزودن پلن', callback_data: 'plan_add' },
      { text: '📋 مشاهده پلن‌ها', callback_data: 'plan_list' }
    ],
    [{ text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }]
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
