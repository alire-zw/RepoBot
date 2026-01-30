import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import { getClientTrafficsByEmail } from '../services/serverService.js';
import { getMyConfigDetailMessage, buildMyConfigDetailKeyboard } from '../helpers/myConfigHelpers.js';

export default async function myConfigDetailHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  let subId = null;
  if (ctx.match && Array.isArray(ctx.match) && ctx.match[1]) {
    subId = parseInt(ctx.match[1], 10);
  } else {
    const data = ctx.callbackQuery?.data;
    if (data && data.startsWith('myconfig_detail_')) {
      subId = parseInt(data.replace('myconfig_detail_', ''), 10);
    }
  }
  if (!subId || isNaN(subId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const sub = await getSubscriptionById(subId);
  if (!sub || Number(sub.userID) !== Number(userId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const server = await findServerByDatabaseID(sub.serverId);
  const live = server ? await getClientTrafficsByEmail(server, sub.clientEmail) : { success: false };

  const message = getMyConfigDetailMessage(sub, live);
  const keyboard = buildMyConfigDetailKeyboard(sub.id, sub, live);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch (e) {
    if (e.description?.includes('message is not modified')) return;
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
