import { isAdmin } from '../services/admin.js';
import { clearServerAddingState } from '../services/serverState.js';
import { getServersManagementMessage } from '../helpers/serverListHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  clearServerAddingState(userId);

  try {
    const message = getServersManagementMessage();

    const keyboard = [
      [
        { text: '➕ افزودن سرور', callback_data: 'server_add' },
        { text: '📋 مشاهده سرورها', callback_data: 'server_list' }
      ],
      [
        { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
      ]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        return;
      }
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    console.error('[serversManagementHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش مدیریت سرورها', show_alert: true });
  }
};
