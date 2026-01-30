import {
  findServerByDatabaseID,
  deleteServer,
  getAllServers,
  checkServerConnection
} from '../services/serverService.js';
import { isAdmin } from '../services/admin.js';
import {
  getServersListMessage,
  buildServersListKeyboard
} from '../helpers/serverListHelpers.js';

const PER_PAGE = 5;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let serverId = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    serverId = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith('server_delete_confirm_')) {
      serverId = parseInt(data.replace('server_delete_confirm_', ''), 10);
    }
  }

  if (!serverId || isNaN(serverId)) {
    await ctx.answerCbQuery({ text: 'آیدی سرور نامعتبر است', show_alert: true });
    return;
  }

  try {
    const server = await findServerByDatabaseID(serverId);
    if (!server) {
      await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
      return;
    }

    await deleteServer(serverId);
    console.log(`[serverDeleteConfirmHandler] Server deleted: id=${serverId}, name=${server.serverName}`);
    await ctx.answerCbQuery({ text: `✅ سرور "${server.serverName}" حذف شد`, show_alert: false });

    const servers = await getAllServers();
    if (servers.length === 0) {
      const result = buildServersListKeyboard(servers, 1, PER_PAGE, []);
      const message = getServersListMessage(1, 1, 0);
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: result.inline_keyboard }
        });
      } catch (e) {
        if (!e.description?.includes('message is not modified')) {
          await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: result.inline_keyboard } });
        }
      }
      return;
    }

    try {
      await ctx.editMessageText('⏳ در حال بررسی اتصال سرورها...', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'server_management' }]] }
      });
    } catch (_) {}

    const slice = servers.slice(0, PER_PAGE);
    const connectionResults = await Promise.all(slice.map((s) => checkServerConnection(s)));
    const result = buildServersListKeyboard(servers, 1, PER_PAGE, connectionResults);
    const message = getServersListMessage(result.currentPage, result.totalPages, result.totalServers);

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
    console.error('[serverDeleteConfirmHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در حذف سرور', show_alert: true });
  }
};
