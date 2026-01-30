import { getAllServers } from '../services/serverService.js';
import { isAdmin } from '../services/admin.js';
import { getPlanAddState, setPlanAddState } from '../services/planState.js';
import { buildServerSelectKeyboard } from '../helpers/planAddHelpers.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const state = getPlanAddState(userId);
  if (!state || state.step !== 'category') {
    await ctx.answerCbQuery({ text: 'مرحله نامعتبر است', show_alert: true });
    return;
  }

  let categoryId = null;
  const data = ctx.callbackQuery?.data;
  if (data && data.startsWith('plan_category_')) {
    categoryId = parseInt(data.replace('plan_category_', ''), 10);
  }
  if (!categoryId || isNaN(categoryId)) {
    await ctx.answerCbQuery({ text: 'دسته‌بندی نامعتبر است', show_alert: true });
    return;
  }

  const dataState = state.data || {};
  dataState.categoryId = categoryId;
  setPlanAddState(userId, { ...state, step: 'server', data: dataState });

  const servers = await getAllServers();
  if (servers.length === 0) {
    await ctx.answerCbQuery({ text: 'هیچ سروری ثبت نشده است. ابتدا سرور اضافه کنید.', show_alert: true });
    return;
  }

  const keyboard = buildServerSelectKeyboard(servers);
  const message = `🖥️ <b>انتخاب سرور</b>\n\nاین پلن روی کدام سرور به فروش برسد؟`;

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
