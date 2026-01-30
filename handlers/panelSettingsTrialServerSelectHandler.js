import { isAdmin } from '../services/admin.js';
import { findServerByDatabaseID, getServerInbounds } from '../services/serverService.js';

const BUTTON_TEXT_MAX = 28;

export default async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const data = ctx.callbackQuery?.data;
  const match = data?.match(/^panel_settings_trial_server_(\d+)$/);
  if (!match) return;
  const serverId = parseInt(match[1], 10);
  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }
  let inbounds = [];
  try {
    inbounds = await getServerInbounds(server);
  } catch (e) {
    await ctx.answerCbQuery({ text: 'خطا در دریافت اینباندها: ' + (e.message || e), show_alert: true });
    return;
  }
  const message = `اینباند اشتراک تست را برای سرور <b>${server.serverName || server.serverIP}</b> انتخاب کنید:`;
  const keyboard = (inbounds || []).map((ib, idx) => {
    const tag = ib.tag || ib.protocol || `اینباند ${idx + 1}`;
    const label = tag.length > BUTTON_TEXT_MAX ? tag.substring(0, BUTTON_TEXT_MAX - 1) + '…' : tag;
    const inboundId = ib.id != null ? String(ib.id) : String(idx);
    return [{ text: label, callback_data: `panel_settings_trial_inbound_${serverId}_${inboundId}` }];
  });
  keyboard.push([{ text: '🔙 بازگشت', callback_data: 'panel_settings_trial' }]);
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
}
