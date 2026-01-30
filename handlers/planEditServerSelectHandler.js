import { findServerByDatabaseID, getServerInbounds } from '../services/serverService.js';
import { findPlanById } from '../services/planService.js';
import { isAdmin } from '../services/admin.js';
import { getPlanEditState, setPlanEditState } from '../services/planState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('plan_edit_server_select_')) return;
  const parts = data.replace('plan_edit_server_select_', '').split('_');
  const planId = parseInt(parts[0], 10);
  const serverId = parseInt(parts[1], 10);
  if (!planId || isNaN(planId) || !serverId || isNaN(serverId)) {
    await ctx.answerCbQuery({ text: 'داده نامعتبر است', show_alert: true });
    return;
  }

  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }

  try {
    await ctx.editMessageText('⏳ در حال دریافت لیست اینباندها...');
  } catch (_) {}

  let inbounds = [];
  try {
    inbounds = await getServerInbounds(server);
  } catch (err) {
    console.error('[planEditServerSelectHandler] getServerInbounds error:', err);
    await ctx.answerCbQuery({ text: 'خطا در دریافت اینباندها از سرور', show_alert: true });
    return;
  }

  if (inbounds.length === 0) {
    await ctx.answerCbQuery({ text: 'این سرور اینباندی ندارد', show_alert: true });
    return;
  }

  const state = getPlanEditState(userId);
  setPlanEditState(userId, {
    ...state,
    planId,
    field: 'server',
    step: 'inbound',
    serverId,
    _inboundsCache: inbounds,
    chatId: ctx.chat?.id,
    requestMessageId: ctx.callbackQuery?.message?.message_id
  });

  const keyboard = [];
  for (let i = 0; i < inbounds.length; i += 2) {
    const row = [];
    const tag0 = (inbounds[i].tag || inbounds[i].id || `#${i}`).substring(0, 18);
    row.push({
      text: `📡 ${tag0}`,
      callback_data: `plan_edit_inbound_select_${planId}_${serverId}_${i}`
    });
    if (inbounds[i + 1]) {
      const tag1 = (inbounds[i + 1].tag || inbounds[i + 1].id || `#${i + 1}`).substring(0, 18);
      row.push({
        text: `📡 ${tag1}`,
        callback_data: `plan_edit_inbound_select_${planId}_${serverId}_${i + 1}`
      });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '🔙 انصراف', callback_data: `plan_detail_${planId}` }]);

  const message = `✏️ <b>انتخاب اینباند</b>\n\nاینباند جدید را انتخاب کنید:`;

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
