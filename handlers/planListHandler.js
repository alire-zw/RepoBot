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

  try {
    const plans = await getAllPlans();
    const result = buildPlansListKeyboard(plans, 1, PER_PAGE);
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
    console.error('[planListHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست پلن‌ها', show_alert: true });
  }
};
