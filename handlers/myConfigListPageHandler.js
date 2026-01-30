import { getUserSubscriptions } from '../services/userSubscriptionService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import { getClientTrafficsByEmail } from '../services/serverService.js';
import { getMyConfigsListMessage, buildMyConfigsListKeyboard, PER_PAGE } from '../helpers/myConfigHelpers.js';

export default async function myConfigListPageHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  let page = 1;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    page = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith('myconfig_list_page_')) {
      page = parseInt(data.replace('myconfig_list_page_', ''), 10);
    }
  }
  if (!page || isNaN(page) || page < 1) page = 1;

  try {
    const subs = await getUserSubscriptions(userId);
    const totalPages = Math.ceil(subs.length / PER_PAGE) || 1;
    const validPage = Math.max(1, Math.min(page, totalPages));

    if (subs.length === 0) {
      const { inline_keyboard } = buildMyConfigsListKeyboard([], 1, 0);
      const message = getMyConfigsListMessage(1, 1, 0);
      try {
        await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
      } catch {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
      }
      return;
    }

    try {
      await ctx.editMessageText('⏳ در حال بروزرسانی...');
    } catch (_) {}

    const items = await Promise.all(
      subs.map(async (sub) => {
        const server = await findServerByDatabaseID(sub.serverId);
        const live = server
          ? await getClientTrafficsByEmail(server, sub.clientEmail)
          : { success: false };
        return { sub, live };
      })
    );

    const { inline_keyboard } = buildMyConfigsListKeyboard(items, validPage, subs.length);
    const message = getMyConfigsListMessage(validPage, totalPages, subs.length);

    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    } catch (e) {
      if (!e.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
      }
    }
  } catch (error) {
    console.error('[myConfigListPageHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست', show_alert: true }).catch(() => {});
  }
}
