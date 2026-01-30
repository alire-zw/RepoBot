import { getAllPlans } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getPlansListMessage, buildPlansListKeyboard } from '../helpers/planListHelpers.js';

const PER_PAGE = 8;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let page = null;
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('plan_list_page_')) {
    page = parseInt(data.replace('plan_list_page_', ''), 10);
  }
  if (!page || isNaN(page) || page < 1) {
    await ctx.answerCbQuery({ text: 'صفحه نامعتبر است', show_alert: true });
    return;
  }

  try {
    const plans = await getAllPlans();
    const totalPagesComputed = Math.ceil(plans.length / PER_PAGE) || 1;
    const validPage = Math.max(1, Math.min(page, totalPagesComputed));
    const result = buildPlansListKeyboard(plans, validPage, PER_PAGE);
    const message = getPlansListMessage(result.currentPage, result.totalPages, result.totalPlans);
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: result.inline_keyboard }
      });
    } catch (error) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: result.inline_keyboard }
        });
      }
    }
  } catch (error) {
    console.error('[planListPageHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست پلن‌ها', show_alert: true });
  }
};
