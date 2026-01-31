import { findServerByDatabaseID, checkServerConnection, getServerStats } from '../services/serverService.js';
import { getServerDetailKeyboard, getServerDetailMessage } from '../helpers/serverDetailHelpers.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  let serverId = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    serverId = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith('server_detail_')) {
      serverId = parseInt(data.replace('server_detail_', ''), 10);
    }
  }

  if (!serverId || isNaN(serverId)) {
    await ctx.answerCbQuery({ text: 'آیدی سرور نامعتبر است', show_alert: true });
    return;
  }

  // Answer callback immediately (Telegram expires callbacks after a short time)
  try {
    await ctx.answerCbQuery({ text: '⏳ در حال بررسی اتصال و دریافت آمار...', show_alert: false });
  } catch (_) {}

  try {
    const server = await findServerByDatabaseID(serverId);
    if (!server) {
      console.log(`[serverDetailHandler] Server not found: id=${serverId}`);
      try {
        await ctx.editMessageText('❌ سرور یافت نشد.', { reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت به لیست سرورها', callback_data: 'server_list' }]] } });
      } catch (_) {
        await ctx.reply('❌ سرور یافت نشد.').catch(() => {});
      }
      return;
    }

    console.log(`[serverDetailHandler] Showing server details: id=${serverId}, name=${server.serverName}`);

    const connectionResult = await checkServerConnection(server);
    const statsResult = await getServerStats(server);
    const stats = statsResult.success ? statsResult.stats : null;

    const keyboard = getServerDetailKeyboard(server, stats, connectionResult, serverId);
    const message = getServerDetailMessage(server, connectionResult);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[serverDetailHandler] Error:', error);
    try {
      await ctx.editMessageText('❌ خطا در نمایش اطلاعات سرور. لطفاً دوباره تلاش کنید.', {
        reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت به لیست سرورها', callback_data: 'server_list' }]] }
      });
    } catch (_) {
      await ctx.reply('❌ خطا در نمایش اطلاعات سرور.').catch(() => {});
    }
  }
};
