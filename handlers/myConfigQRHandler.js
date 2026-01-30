import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import { getClientTrafficsByEmail } from '../services/serverService.js';
import { getMyConfigDetailMessage, buildMyConfigDetailKeyboard } from '../helpers/myConfigHelpers.js';
import { generateQrBuffer } from '../helpers/purchaseHelpers.js';
import { ctxDeleteThenReply } from '../helpers/myConfigDetailHelpers.js';

export default async function myConfigQRHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('myconfig_qr_')) return;
  const subId = parseInt(data.replace('myconfig_qr_', ''), 10);
  if (!subId || isNaN(subId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const sub = await getSubscriptionById(subId);
  if (!sub || Number(sub.userID) !== Number(userId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const connectionLink = sub.connectionLink && sub.connectionLink.trim() ? sub.connectionLink : null;
  if (!connectionLink) {
    await ctx.answerCbQuery({
      text: 'لینک اتصال موجود نیست. از گزینه «قطع دسترسی و دریافت مجدد لینک» استفاده کنید.',
      show_alert: true
    });
    return;
  }

  const server = await findServerByDatabaseID(sub.serverId);
  const live = server ? await getClientTrafficsByEmail(server, sub.clientEmail) : { success: false };
  const caption = getMyConfigDetailMessage(sub, live);
  const keyboard = buildMyConfigDetailKeyboard(sub.id, sub, live);

  await ctxDeleteThenReply(ctx, async () => {
    const qrBuffer = await generateQrBuffer(connectionLink);
    if (qrBuffer) {
      await ctx.replyWithPhoto({ source: qrBuffer }, {
        caption,
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  });
}
