import { isAdmin } from '../services/admin.js';
import { findRenewalById, updateRenewal } from '../services/renewalService.js';
import { adminRenewalMessages } from './planOrderReceiptHandler.js';

export default async function renewalRejectHandler(ctx) {
  const userID = ctx.from?.id;
  if (!isAdmin(userID)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const match = ctx.callbackQuery?.data?.match(/^renewal_reject_(\d+)$/);
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
  await updateRenewal(renewalId, { status: 'rejected', rejectedBy: userID });
  const renewalKey = `renewal_${renewalId}`;
  const adminMessages = adminRenewalMessages.get(renewalKey);
  const doneCaption = `🔄 <b>درخواست تمدید اشتراک</b>\n\n❌ رد شده.\nشناسه تمدید: <code>${renewalId}</code>`;
  const doneMarkup = { inline_keyboard: [[{ text: '❌ رد شده', callback_data: 'renewal_rejected' }]] };
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
    await ctx.telegram.sendMessage(
      renewal.userID,
      '❌ درخواست تمدید اشتراک شما رد شد. در صورت واریز مبلغ با پشتیبانی تماس بگیرید.',
      { reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }]] } }
    );
  } catch (_) {}
  await ctx.answerCbQuery({ text: 'درخواست تمدید رد شد' });
}
