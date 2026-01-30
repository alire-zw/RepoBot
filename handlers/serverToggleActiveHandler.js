import { findServerByDatabaseID, updateServer, checkServerConnection, getServerStats } from '../services/serverService.js';
import { getServerDetailKeyboard, getServerDetailMessage } from '../helpers/serverDetailHelpers.js';
import { isAdmin } from '../services/admin.js';

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
    if (data && data.startsWith('server_toggle_')) {
      serverId = parseInt(data.replace('server_toggle_', ''), 10);
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

    const currentActive = server.isActive === 1 || server.isActive === true;
    const newActive = !currentActive;
    await updateServer(serverId, { isActive: newActive });

    console.log(`[serverToggleActiveHandler] Toggling server: id=${serverId}, name=${server.serverName}, active: ${currentActive} -> ${newActive}`);

    await ctx.answerCbQuery({
      text: newActive ? '✅ سرور فعال شد' : '❌ سرور غیرفعال شد',
      show_alert: false
    });

    const updated = await findServerByDatabaseID(serverId);
    const connectionResult = await checkServerConnection(updated);
    const statsResult = await getServerStats(updated);
    const stats = statsResult.success ? statsResult.stats : null;

    const keyboard = getServerDetailKeyboard(updated, stats, connectionResult, serverId);
    const message = getServerDetailMessage(updated, connectionResult);

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
        });
      }
    }
  } catch (error) {
    console.error('[serverToggleActiveHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در تغییر وضعیت سرور', show_alert: true });
  }
};
