import { isAdmin } from '../services/admin.js';
import { getTrialEnabled, getTrialServerId, getTrialInboundId, hasUserClaimedTrial, markTrialClaimed } from '../services/panelSettingsService.js';
import { findServerByDatabaseID, addClientToInbound, getServerInbounds, buildClientConnectionLink, getNextClientNumber } from '../services/serverService.js';
import { getPool } from '../services/database.js';
import { getSupportLink, getPvUsername } from '../services/paymentSettingsService.js';
import {
  getPurchaseDeliveredMessage,
  getPurchaseDeliveredKeyboard,
  generateQrBuffer
} from '../helpers/purchaseHelpers.js';
import config from '../config/env.js';

const TRIAL_VOLUME_BYTES = 100 * 1024 * 1024;
const TRIAL_VOLUME_GB = 100 / 1024;
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000;

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const trialOn = await getTrialEnabled();
  if (!trialOn) {
    await ctx.answerCbQuery({ text: 'اشتراک تست در حال حاضر غیرفعال است', show_alert: true });
    return;
  }

  const claimed = await hasUserClaimedTrial(userId);
  const isAdminUser = isAdmin(userId);
  if (claimed && !isAdminUser) {
    const msg = `🧪 <b>اشتراک تست</b>

با تشکر از توجه شما به سرویس ما. 🙏

طبق قوانین فعلی، هر کاربر تنها <b>یک‌بار</b> امکان دریافت اشتراک تست رایگان را دارد و شما قبلاً از این امکان استفاده کرده‌اید.

برای ادامهٔ استفاده می‌توانید از بخش <b>خرید اشتراک جدید</b> یکی از پلن‌های مناسب را انتخاب کنید؛ در صورت هرگونه سؤال، پشتیبانی در خدمت شماست. 💬`;
    const keyboard = { inline_keyboard: [[{ text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }]] };
    try {
      await ctx.editMessageText(msg, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    await ctx.answerCbQuery();
    return;
  }

  const serverId = await getTrialServerId();
  const inboundId = await getTrialInboundId();
  if (!serverId || !inboundId) {
    await ctx.answerCbQuery({ text: 'اشتراک تست توسط ادمین تنظیم نشده است', show_alert: true });
    return;
  }

  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور اشتراک تست در دسترس نیست', show_alert: true });
    return;
  }

  const trialRemark = (server.remark || server.serverName || '').trim() || 'client';
  const remarkPrefix = `test ${trialRemark}`;
  const nextNum = await getNextClientNumber(server, inboundId, remarkPrefix);
  const clientEmail = `${remarkPrefix} - ${nextNum}`;
  const expiryTime = Date.now() + TRIAL_DURATION_MS;
  const addResult = await addClientToInbound(server, inboundId, clientEmail, {
    totalGB: TRIAL_VOLUME_GB,
    expiryTime
  });

  if (!addResult.success) {
    await ctx.answerCbQuery({ text: 'خطا در ایجاد اشتراک تست. لطفاً بعداً تلاش کنید.', show_alert: true });
    return;
  }

  await markTrialClaimed(userId);

  let inbounds;
  try {
    inbounds = await getServerInbounds(server);
  } catch (_) {
    inbounds = [];
  }
  const inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(inboundId));
  const connectionLink = inbound
    ? buildClientConnectionLink(server, inbound, addResult.uuid || '', clientEmail)
    : null;

  const pool = getPool();
  const [planRow] = await pool.query('SELECT id FROM plans WHERE serverId = ? LIMIT 1', [serverId]);
  const planId = planRow && planRow[0] ? planRow[0].id : 0;

  await pool.query(
    `INSERT INTO user_subscriptions
     (userID, planId, inboundId, planName, serverId, serverName, volumeGB, durationDays, connectionLink, clientEmail, expiryTime, paymentMethod, planOrderId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'wallet', NULL)`,
    [
      userId,
      planId,
      inboundId,
      clientEmail,
      serverId,
      server.serverName || server.serverIP,
      TRIAL_VOLUME_GB,
      1,
      connectionLink,
      clientEmail,
      expiryTime
    ]
  );

  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nameLine = `📌 <b>نام اشتراک:</b> <code>${escapeHtml(clientEmail)}</code>\n\n`;
  const configText = connectionLink
    ? nameLine + `🔗 <b>لینک اتصال:</b>\n\n<pre><code>${escapeHtml(connectionLink)}</code></pre>`
    : nameLine + '📌 شناسه کلاینت: <code>' + escapeHtml(clientEmail) + '</code>\n\nدر صورت نیاز به لینک اشتراک با پشتیبانی تماس بگیرید. 💬';
  const deliveredMsg = getPurchaseDeliveredMessage(configText);
  const supportLinkSetting = await getSupportLink();
  const pvUsername = await getPvUsername();
  const supportLinkFromPv = pvUsername ? `https://t.me/${pvUsername.replace(/^@/, '')}` : '';
  const supportLink = supportLinkSetting || supportLinkFromPv || config.SUPPORT_LINK;
  const keyboard = getPurchaseDeliveredKeyboard(supportLink);

  try {
    await ctx.editMessageText('✅ اشتراک تست شما با موفقیت فعال شد. جزئیات در پیام زیر تحویل داده شد.', { parse_mode: 'HTML' });
  } catch (_) {
    // ignore
  }
  try {
    if (connectionLink) {
      const qrBuffer = await generateQrBuffer(connectionLink);
      if (qrBuffer) {
        await ctx.replyWithPhoto({ source: qrBuffer }, {
          caption: deliveredMsg,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    } else {
      await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (e) {
    console.error('trialClaimHandler send delivery:', e?.message);
    await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
