import { findServerByDatabaseID, getServerInbounds } from '../services/serverService.js';
import { isAdmin } from '../services/admin.js';
import { getPlanAddState, setPlanAddState } from '../services/planState.js';
import { buildInboundSelectKeyboard } from '../helpers/planAddHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const state = getPlanAddState(userId);
  if (!state || state.step !== 'server') {
    await ctx.answerCbQuery({ text: 'مرحله نامعتبر است', show_alert: true });
    return;
  }

  let serverId = null;
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('plan_server_')) {
    serverId = parseInt(data.replace('plan_server_', ''), 10);
  }
  if (!serverId || isNaN(serverId)) {
    await ctx.answerCbQuery({ text: 'سرور نامعتبر است', show_alert: true });
    return;
  }

  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }

  try {
    await ctx.editMessageText('⏳ در حال دریافت لیست اینباندها از سرور...');
  } catch (_) {}

  let inbounds = [];
  try {
    inbounds = await getServerInbounds(server);
  } catch (err) {
    console.error('[planServerSelectHandler] getServerInbounds error:', err);
    await ctx.answerCbQuery({ text: 'خطا در دریافت اینباندها از سرور. سرور دیگری انتخاب کنید.', show_alert: true });
    return;
  }

  if (inbounds.length === 0) {
    await ctx.answerCbQuery({ text: 'این سرور اینباندی ندارد.', show_alert: true });
    return;
  }

  const dataState = state.data || {};
  dataState.serverId = serverId;
  dataState._inboundsCache = inbounds;
  setPlanAddState(userId, { ...state, step: 'inbound', data: dataState });

  const keyboard = buildInboundSelectKeyboard(serverId, inbounds);
  const message = `📡 <b>انتخاب اینباند</b>\n\nکلاینت این پلن کدام اینباند باشد؟`;

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
