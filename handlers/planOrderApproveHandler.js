import config from '../config/env.js';
import { isAdmin } from '../services/admin.js';
import { getSupportLink, getPvUsername } from '../services/paymentSettingsService.js';
import { findPlanOrderById, updatePlanOrder } from '../services/planOrderService.js';
import { createUserSubscription } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import {
  findServerByDatabaseID,
  getServerInbounds,
  getNextClientNumber,
  addClientToInbound,
  buildClientConnectionLink
} from '../services/serverService.js';
import { decrementPlanCapacity } from '../services/planService.js';
import {
  getPurchaseDeliveredMessage,
  getPurchaseDeliveredKeyboard,
  generateQrBuffer
} from '../helpers/purchaseHelpers.js';
import { adminPlanOrderMessages } from './planOrderReceiptHandler.js';

export default async (ctx) => {
  const userID = ctx.from?.id;
  if (!isAdmin(userID)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const match = ctx.callbackQuery?.data?.match(/^plan_order_approve_(\d+)$/);
  if (!match) return;
  const orderId = parseInt(match[1], 10);
  const order = await findPlanOrderById(orderId);
  if (!order) {
    await ctx.answerCbQuery({ text: 'سفارش یافت نشد', show_alert: true });
    return;
  }
  if (order.status !== 'pending') {
    await ctx.answerCbQuery({ text: 'این سفارش قبلاً پردازش شده است', show_alert: true });
    return;
  }
  const plan = await findPlanById(order.planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }
  const server = await findServerByDatabaseID(plan.serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }
  const remarkPrefix = (server.remark || server.serverName || '').trim() || 'client';
  let inbound = null;
  try {
    const inbounds = await getServerInbounds(server);
    inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(plan.inboundId));
  } catch (e) {
    console.error('planOrderApprove getServerInbounds:', e?.message);
  }
  const nextNum = await getNextClientNumber(server, plan.inboundId, remarkPrefix);
  const clientEmail = `${remarkPrefix} - ${nextNum}`;
  const expireTime = plan.durationDays
    ? Date.now() + plan.durationDays * 24 * 60 * 60 * 1000
    : null;
  const addResult = await addClientToInbound(server, plan.inboundId, clientEmail, {
    totalGB: plan.volumeGB,
    expiryTime: expireTime || 0
  });
  if (!addResult.success) {
    await ctx.answerCbQuery({
      text: `خطا در ساخت کلاینت: ${addResult.error || 'نامشخص'}`,
      show_alert: true
    });
    return;
  }
  await decrementPlanCapacity(plan.id);
  let connectionLink = null;
  if (inbound && addResult.uuid) {
    connectionLink = buildClientConnectionLink(server, inbound, addResult.uuid, clientEmail);
  }
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nameLine = `📌 <b>نام اشتراک:</b> <code>${escapeHtml(clientEmail)}</code>\n\n`;
  const configText = connectionLink
    ? nameLine + `🔗 <b>لینک اتصال:</b>\n\n<pre><code>${escapeHtml(connectionLink)}</code></pre>`
    : nameLine + `📌 شناسه کلاینت: <code>${escapeHtml(clientEmail)}</code>\n\nدر صورت نیاز به لینک اشتراک با پشتیبانی تماس بگیرید. 💬`;
  await updatePlanOrder(orderId, {
    status: 'completed',
    approvedBy: userID,
    clientConfig: configText
  });
  try {
    await createUserSubscription({
      userID: order.userID,
      planId: plan.id,
      inboundId: String(plan.inboundId || ''),
      planName: plan.name,
      serverId: server.id,
      serverName: server.serverName || '',
      volumeGB: plan.volumeGB,
      durationDays: plan.durationDays,
      connectionLink,
      clientEmail,
      expiryTime: expireTime || null,
      paymentMethod: 'card',
      planOrderId: orderId
    });
  } catch (e) {
    console.error('planOrderApprove createUserSubscription:', e?.message);
  }
  const orderKey = `plan_order_${orderId}`;
  const adminMessages = adminPlanOrderMessages.get(orderKey);
  const doneCaption = `🛒 <b>سفارش خرید اشتراک</b>\n\n✅ تایید و تحویل داده شد.\nشناسه سفارش: <code>${orderId}</code>`;
  const doneMarkup = {
    inline_keyboard: [[{ text: '✅ تایید شده', callback_data: 'plan_order_done' }]]
  };
  if (adminMessages && adminMessages.length > 0) {
    for (const msg of adminMessages) {
      try {
        await ctx.telegram.editMessageCaption(msg.chatId, msg.messageId, {
          caption: doneCaption,
          parse_mode: 'HTML',
          reply_markup: doneMarkup
        });
      } catch (_) {
        try {
          await ctx.telegram.editMessageReplyMarkup(msg.chatId, msg.messageId, { reply_markup: doneMarkup });
        } catch (_) {}
      }
    }
    adminPlanOrderMessages.delete(orderKey);
  } else {
    try {
      const cbMsg = ctx.callbackQuery?.message;
      if (cbMsg?.photo)
        await ctx.telegram.editMessageCaption(cbMsg.chat.id, cbMsg.message_id, {
          caption: doneCaption,
          parse_mode: 'HTML',
          reply_markup: doneMarkup
        });
      else
        await ctx.telegram.editMessageReplyMarkup(cbMsg.chat.id, cbMsg.message_id, { reply_markup: doneMarkup });
    } catch (_) {}
  }
  const deliveredMsg = getPurchaseDeliveredMessage(configText);
  const supportLinkSetting = await getSupportLink();
  const pvUsername = await getPvUsername();
  const supportLinkFromPv = pvUsername ? `https://t.me/${pvUsername.replace(/^@/, '')}` : '';
  const supportLink = supportLinkSetting || supportLinkFromPv || config.SUPPORT_LINK;
  const keyboard = getPurchaseDeliveredKeyboard(supportLink);
  try {
    if (connectionLink) {
      const qrBuffer = await generateQrBuffer(connectionLink);
      if (qrBuffer) {
        await ctx.telegram.sendPhoto(order.userID, { source: qrBuffer }, {
          caption: deliveredMsg,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.telegram.sendMessage(order.userID, deliveredMsg, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
    } else {
      await ctx.telegram.sendMessage(order.userID, deliveredMsg, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }
  } catch (err) {
    if (err?.code !== 403) console.error('planOrderApprove send to user:', err?.message);
  }
  await ctx.answerCbQuery({ text: 'سفارش تایید و به کاربر تحویل داده شد' });
};
