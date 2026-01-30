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

  let page = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    page = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (!data || !data.startsWith('server_list_page_')) return;
    page = parseInt(data.replace('server_list_page_', ''), 10);
  }
  if (!page || isNaN(page) || page < 1) {
    await ctx.answerCbQuery({ text: 'صفحه نامعتبر است', show_alert: true });
    return;
  }

  try {
    const servers = await getAllServers();
    const totalPagesComputed = Math.ceil(servers.length / PER_PAGE) || 1;
    const validPage = Math.max(1, Math.min(page, totalPagesComputed));

    if (servers.length === 0) {
      const { inline_keyboard, currentPage, totalPages, totalServers } = buildServersListKeyboard(
        servers,
        validPage,
        PER_PAGE,
        []
      );
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

    const start = (validPage - 1) * PER_PAGE;
    const slice = servers.slice(start, start + PER_PAGE);
    const connectionResults = await Promise.all(slice.map((s) => checkServerConnection(s)));

    const { inline_keyboard, currentPage, totalPages, totalServers } = buildServersListKeyboard(
      servers,
      validPage,
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
    console.error('[serverListPageHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست سرورها', show_alert: true });
  }
};
