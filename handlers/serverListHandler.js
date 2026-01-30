import { getAllServers, checkServerConnection } from '../services/serverService.js';
import { isAdmin } from '../services/admin.js';
import { getServersListMessage, buildServersListKeyboard } from '../helpers/serverListHelpers.js';

const PER_PAGE = 5;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const servers = await getAllServers();
    if (servers.length === 0) {
      const { inline_keyboard, currentPage, totalPages, totalServers } = buildServersListKeyboard(servers, 1, PER_PAGE, []);
      const message = getServersListMessage(currentPage, totalPages, totalServers);
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } }).catch(() =>
        ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } })
      );
      return;
    }

    const waitMsg = '⏳ در حال بررسی اتصال سرورها...';
    try {
      await ctx.editMessageText(waitMsg);
    } catch (_) {
      await ctx.reply(waitMsg).catch(() => {});
    }

    const page = 1;
    const start = (page - 1) * PER_PAGE;
    const slice = servers.slice(start, start + PER_PAGE);
    const connectionResults = await Promise.all(slice.map((s) => checkServerConnection(s)));

    const { inline_keyboard, currentPage, totalPages, totalServers } = buildServersListKeyboard(
      servers,
      page,
      PER_PAGE,
      connectionResults
    );
    const message = getServersListMessage(currentPage, totalPages, totalServers);

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
    console.error('[serverListHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست سرورها', show_alert: true });
  }
};
