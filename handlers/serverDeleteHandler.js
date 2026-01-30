import { findServerByDatabaseID } from '../services/serverService.js';
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
    if (data && data.startsWith('server_delete_')) {
      serverId = parseInt(data.replace('server_delete_', ''), 10);
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

    console.log(`[serverDeleteHandler] Confirm delete server: id=${serverId}, name=${server.serverName}`);

    const message = `🗑️ <b>حذف سرور</b>

<b>نام:</b> ${server.serverName}
<b>IP:</b> <code>${server.serverIP}</code>
<b>پورت:</b> ${server.port}

⚠️ آیا مطمئن هستید که می‌خواهید این سرور را حذف کنید؟`;

    const keyboard = [
      [
        { text: '✅ بله، حذف کن', callback_data: `server_delete_confirm_${serverId}` },
        { text: '❌ خیر، لغو', callback_data: `server_detail_${serverId}` }
      ]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (!error.description?.includes('message is not modified')) {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    }
  } catch (error) {
    console.error('[serverDeleteHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش تایید حذف', show_alert: true });
  }
};
