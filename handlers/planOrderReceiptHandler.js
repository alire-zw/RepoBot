import config from '../config/env.js';
import { getPurchaseState, clearPurchaseState } from '../services/purchaseState.js';
import { createPlanOrder } from '../services/planOrderService.js';
import { createRenewal } from '../services/renewalService.js';
import { getPool } from '../services/database.js';

const adminPlanOrderMessages = new Map();
export const adminRenewalMessages = new Map();

export default async (ctx) => {
  const userId = ctx.from?.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'waiting_plan_order_receipt') {
    return false;
  }
  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) {
    await ctx.reply('❌ لطفاً تصویر رسید پرداخت را ارسال کنید.');
    return true;
  }
  const plan = state.plan;
  if (!plan) {
    clearPurchaseState(userId);
    await ctx.reply('اطلاعات خرید یافت نشد. لطفاً از ابتدا مراحل را انجام دهید.');
    return true;
  }
  try {
    const pool = getPool();
    const [userRows] = await pool.query(
      'SELECT name, username FROM users WHERE userID = ? LIMIT 1',
      [userId]
    );
    const userName = userRows[0]?.username || 'بدون یوزرنیم';
    const userFullName = userRows[0]?.name || 'نامشخص';
    const amount = plan.priceToman;
    const formattedAmount = amount.toLocaleString('en-US');
    const fileId = photo[photo.length - 1].file_id;
    const renewalSubId = state.renewalSubId || null;

    if (renewalSubId) {
      const renewal = await createRenewal({
        userID: userId,
        subscriptionId: renewalSubId,
        planId: plan.id,
        amount,
        paymentMethod: 'card',
        status: 'pending',
        receiptImagePath: fileId
      });
      const renewalId = renewal.id;
      const adminMessage = `🔄 <b>درخواست تمدید اشتراک (کارت به کارت)</b>

<b>پلن:</b> ${plan.name || ''}
<b>مبلغ:</b> ${formattedAmount} تومان
<b>کاربر:</b> ${userFullName}
<b>یوزرنیم:</b> @${userName}
<b>آیدی:</b> <code>${userId}</code>
<b>شناسه تمدید:</b> <code>${renewalId}</code>`;
      const renewalKey = `renewal_${renewalId}`;
      const adminMessages = [];
      for (const adminID of config.ADMINS) {
        try {
          const sent = await ctx.telegram.sendPhoto(adminID, fileId, {
            caption: adminMessage,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ تایید', callback_data: `renewal_approve_${renewalId}` },
                  { text: '❌ رد', callback_data: `renewal_reject_${renewalId}` }
                ]
              ]
            }
          });
          if (sent?.message_id && sent?.chat) {
            adminMessages.push({ chatId: sent.chat.id, messageId: sent.message_id });
          }
        } catch (err) {
          const isBlocked = err?.error_code === 403;
          if (!isBlocked) console.error('planOrderReceipt renewal send to admin:', err?.message);
        }
      }
      if (adminMessages.length > 0) adminRenewalMessages.set(renewalKey, adminMessages);
    } else {
      const order = await createPlanOrder({
        userID: userId,
        planId: plan.id,
        amount,
        paymentMethod: 'card',
        status: 'pending'
      });
      const orderId = order.id;
      const adminMessage = `🛒 <b>درخواست خرید اشتراک (کارت به کارت)</b>

<b>پلن:</b> ${plan.name || ''}
<b>مبلغ:</b> ${formattedAmount} تومان
<b>کاربر:</b> ${userFullName}
<b>یوزرنیم:</b> @${userName}
<b>آیدی:</b> <code>${userId}</code>
<b>شناسه سفارش:</b> <code>${orderId}</code>`;
      const orderKey = `plan_order_${orderId}`;
      const adminMessages = [];
      for (const adminID of config.ADMINS) {
        try {
          const sent = await ctx.telegram.sendPhoto(adminID, fileId, {
            caption: adminMessage,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ تایید', callback_data: `plan_order_approve_${orderId}` },
                  { text: '❌ رد', callback_data: `plan_order_reject_${orderId}` }
                ]
              ]
            }
          });
          if (sent?.message_id && sent?.chat) {
            adminMessages.push({ adminID, messageId: sent.message_id, chatId: sent.chat.id });
          }
        } catch (err) {
          const isBlocked = err?.error_code === 403;
          if (!isBlocked) console.error('planOrderReceipt send to admin:', err?.message);
        }
      }
      if (adminMessages.length > 0) adminPlanOrderMessages.set(orderKey, adminMessages);
    }

    try {
      await ctx.deleteMessage();
    } catch (_) {}
    const confirmText = `✅ <b>رسید پرداخت شما دریافت شد</b>

رسید شما با موفقیت به تیم پشتیبانی ارسال شد و در صف بررسی قرار گرفت. پس از تایید واریز (معمولاً در کمتر از ۱۵ دقیقه)، ${renewalSubId ? 'تمدید اشتراک شما اعمال می‌شود.' : 'اشتراک شما فعال و لینک/کانفیگ برایتان ارسال می‌شود.'}

در صورت تاخیر یا هر سوالی، از طریق همین ربات با پشتیبانی در ارتباط باشید.`;
    const backKeyboard = { inline_keyboard: [[{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]] };
    if (state.chatId && state.requestMessageId) {
      try {
        await ctx.telegram.editMessageText(
          state.chatId,
          state.requestMessageId,
          null,
          confirmText,
          { parse_mode: 'HTML', reply_markup: backKeyboard }
        );
      } catch (_) {
        await ctx.reply(confirmText, { parse_mode: 'HTML', reply_markup: backKeyboard });
      }
    } else {
      await ctx.reply(confirmText, { parse_mode: 'HTML', reply_markup: backKeyboard });
    }
    clearPurchaseState(userId);
  } catch (err) {
    console.error('planOrderReceipt:', err);
    await ctx.reply('❌ خطا در ثبت رسید. لطفاً دوباره تلاش کنید.');
  }
  return true;
}

export { adminPlanOrderMessages };
