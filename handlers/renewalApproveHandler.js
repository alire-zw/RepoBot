import { isAdmin } from '../services/admin.js';
import { findRenewalById, updateRenewal } from '../services/renewalService.js';
import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import {
  findServerByDatabaseID,
  getClientFromInbound,
  updateClientInbound
} from '../services/serverService.js';
import { adminRenewalMessages } from './planOrderReceiptHandler.js';

export default async function renewalApproveHandler(ctx) {
  const userID = ctx.from?.id;
  if (!isAdmin(userID)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const match = ctx.callbackQuery?.data?.match(/^renewal_approve_(\d+)$/);
  if (!match) return;
  const renewalId = parseInt(match[1], 10);
  const renewal = await findRenewalById(renewalId);
  if (!renewal) {
    await ctx.answerCbQuery({ text: 'درخواست تمدید یافت نشد', show_alert: true });
    return;
  }
  if (renewal.status !== 'pending') {
    await ctx.answerCbQuery({ text: 'این درخواست قبلاً پردازش شده است', show_alert: true });
    return;
  }
  const plan = await findPlanById(renewal.planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }
  const sub = await getSubscriptionById(renewal.subscriptionId);
  if (!sub || Number(sub.userID) !== Number(renewal.userID)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }
  const server = await findServerByDatabaseID(sub.serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }
  const inboundId = sub.inboundId || plan.inboundId;
  if (!inboundId) {
    await ctx.answerCbQuery({ text: 'اینباند یافت نشد', show_alert: true });
    return;
  }
  const client = await getClientFromInbound(server, inboundId, sub.clientEmail);
  if (!client) {
    await ctx.answerCbQuery({ text: 'کلاینت در پنل یافت نشد', show_alert: true });
    return;
  }
  const currentTotalBytes = Number(client.totalGB) || 0;
  const addBytes = Math.floor(Number(plan.volumeGB) * 1024 * 1024 * 1024);
  const newTotalBytes = currentTotalBytes + addBytes;
  const nowMs = Date.now();
  const currentExpiry = Number(client.expiryTime) || 0;
  const baseExpiry = currentExpiry > 0 && currentExpiry > nowMs ? currentExpiry : nowMs;
  const extendMs = (plan.durationDays || 0) * 24 * 60 * 60 * 1000;
  const newExpiryTime = baseExpiry + extendMs;
  const clientPayload = { ...client, totalGB: newTotalBytes, expiryTime: newExpiryTime };
  const clientUuid = client.id || client.password;
  const updateResult = await updateClientInbound(server, inboundId, clientUuid, clientPayload);
  if (!updateResult.success) {
    await ctx.answerCbQuery({ text: 'خطا در تمدید پنل: ' + (updateResult.error || ''), show_alert: true });
    return;
  }
  await updateRenewal(renewalId, { status: 'completed', approvedBy: userID });
  const renewalKey = `renewal_${renewalId}`;
  const adminMessages = adminRenewalMessages.get(renewalKey);
  const doneCaption = `🔄 <b>درخواست تمدید اشتراک</b>\n\n✅ تایید و تمدید انجام شد.\nشناسه تمدید: <code>${renewalId}</code>`;
  const doneMarkup = { inline_keyboard: [[{ text: '✅ تایید شده', callback_data: 'renewal_done' }]] };
  if (adminMessages && adminMessages.length > 0) {
    for (const msg of adminMessages) {
      try {
        await ctx.telegram.editMessageCaption(msg.chatId, msg.messageId, { caption: doneCaption, parse_mode: 'HTML', reply_markup: doneMarkup });
      } catch (_) {
        try { await ctx.telegram.editMessageReplyMarkup(msg.chatId, msg.messageId, { reply_markup: doneMarkup }); } catch (_) {}
      }
    }
    adminRenewalMessages.delete(renewalKey);
  } else {
    try {
      const cbMsg = ctx.callbackQuery?.message;
      if (cbMsg?.photo) await ctx.telegram.editMessageCaption(cbMsg.chat.id, cbMsg.message_id, { caption: doneCaption, parse_mode: 'HTML', reply_markup: doneMarkup });
      else await ctx.telegram.editMessageReplyMarkup(cbMsg.chat.id, cbMsg.message_id, { reply_markup: doneMarkup });
    } catch (_) {}
  }
  try {
    await ctx.telegram.sendMessage(renewal.userID, '✅ <b>تمدید اشتراک شما با موفقیت انجام شد.</b>\n\nحجم و زمان به اشتراک شما اضافه شد. از بخش «کانفیگ های من» می‌توانید جزئیات را ببینید.', { parse_mode: 'HTML' });
  } catch (err) {
    if (err?.code !== 403) console.error('renewalApprove send to user:', err?.message);
  }
  await ctx.answerCbQuery({ text: 'تمدید تایید و به کاربر اعمال شد' });
}
