import { isAdmin } from '../services/admin.js';
import { getPlanAddState, setPlanAddState } from '../services/planState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const state = getPlanAddState(userId);
  if (!state || state.step !== 'inbound') {
    await ctx.answerCbQuery({ text: 'مرحله نامعتبر است', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('plan_inbound_')) {
    await ctx.answerCbQuery({ text: 'اینباند نامعتبر است', show_alert: true });
    return;
  }
  const parts = data.replace('plan_inbound_', '').split('_');
  const serverId = parseInt(parts[0], 10);
  const index = parseInt(parts[1], 10);
  if (isNaN(serverId) || isNaN(index)) {
    await ctx.answerCbQuery({ text: 'اینباند نامعتبر است', show_alert: true });
    return;
  }

  const inbounds = state.data?._inboundsCache;
  if (!Array.isArray(inbounds) || !inbounds[index]) {
    await ctx.answerCbQuery({ text: 'لیست اینباند منقضی شده. از ابتدا سرور را انتخاب کنید.', show_alert: true });
    return;
  }

  const inbound = inbounds[index];
  const inboundId = inbound.id != null ? String(inbound.id) : String(index);
  const inboundTag = inbound.tag || inbound.protocol || `inbound-${index}`;

  const dataState = { ...state.data };
  delete dataState._inboundsCache;
  dataState.inboundId = inboundId;
  dataState.inboundTag = inboundTag;
  setPlanAddState(userId, { ...state, step: 'capacity', data: dataState });

  const message = `<b>ظرفیت پلن</b>\n\nآیا این پلن ظرفیت محدود است یا نامحدود؟\n• برای <b>محدود</b>: عدد (مثال: 100)\n• برای <b>نامحدود</b>: <code>-</code> بفرستید`;
  const keyboard = [[{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]];

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
