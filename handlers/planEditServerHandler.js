import { findPlanById } from '../services/planService.js';
import { getAllServers } from '../services/serverService.js';
import { isAdmin } from '../services/admin.js';
import { setPlanEditState } from '../services/planState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const planId = data?.startsWith('plan_edit_server_') ? parseInt(data.replace('plan_edit_server_', ''), 10) : null;
  if (!planId || isNaN(planId)) {
    await ctx.answerCbQuery({ text: 'پلن نامعتبر است', show_alert: true });
    return;
  }

  const plan = await findPlanById(planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }

  const servers = await getAllServers();
  if (servers.length === 0) {
    await ctx.answerCbQuery({ text: 'هیچ سروری ثبت نشده است', show_alert: true });
    return;
  }

  setPlanEditState(userId, {
    planId,
    field: 'server',
    step: 'server',
    chatId: ctx.chat?.id,
    requestMessageId: ctx.callbackQuery?.message?.message_id
  });

  const keyboard = servers.map((s) => [
    {
      text: `🖥️ ${(s.serverName || '').substring(0, 20)} (پورت ${s.port})`,
      callback_data: `plan_edit_server_select_${planId}_${s.id}`
    }
  ]);
  keyboard.push([{ text: '🔙 انصراف', callback_data: `plan_detail_${planId}` }]);

  const message = `✏️ <b>ویرایش سرور و اینباند</b>\n\nسرور جدید را انتخاب کنید:`;

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
};
