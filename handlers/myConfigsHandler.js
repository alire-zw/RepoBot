import { getUserSubscriptions } from '../services/userSubscriptionService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import { getClientTrafficsByEmail } from '../services/serverService.js';
import { getMyConfigsListMessage, buildMyConfigsListKeyboard, PER_PAGE } from '../helpers/myConfigHelpers.js';

/** ارسال لیست کانفیگ‌ها با reply (برای استفاده پس از حذف پیام) */
export async function sendMyConfigsList(ctx, page = 1) {
  const userId = ctx.from.id;
  const subs = await getUserSubscriptions(userId);
  const totalPages = Math.ceil(subs.length / PER_PAGE) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));

  if (subs.length === 0) {
    const { inline_keyboard } = buildMyConfigsListKeyboard([], 1, 0);
    const message = getMyConfigsListMessage(1, 1, 0);
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    return;
  }

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
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
}

export default async function myConfigsHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  try {
    const subs = await getUserSubscriptions(userId);
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
      await ctx.editMessageText('⏳ در حال دریافت اطلاعات زنده از پنل...');
    } catch (_) {}

    const items = await Promise.all(
      subs.map(async (sub) => {
        const server = await findServerByDatabaseID(sub.serverId);
        const live = server
          ? await getClientTrafficsByEmail(server, sub.clientEmail)
          : { success: false, error: 'سرور یافت نشد' };
        return { sub, live };
      })
    );

    const { inline_keyboard } = buildMyConfigsListKeyboard(items, 1, subs.length);
    const message = getMyConfigsListMessage(1, Math.ceil(subs.length / PER_PAGE) || 1, subs.length);

    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
    } catch (e) {
      if (!e.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard } });
      }
    }
  } catch (error) {
    console.error('[myConfigsHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست کانفیگ‌ها', show_alert: true }).catch(() => {});
  }
}
