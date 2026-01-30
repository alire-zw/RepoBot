import config from '../config/env.js';
import { isAdmin } from '../services/admin.js';
import { getPool } from '../services/database.js';
import { adminChargeMessages } from './chargeReceipt.js';
import { setRejectState } from '../services/rejectState.js';

export default async (ctx) => {
  const userID = ctx.from.id;
  if (!isAdmin(userID)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || typeof callbackData !== 'string') {
    await ctx.answerCbQuery({ text: 'خطا در دریافت اطلاعات', show_alert: true });
    return;
  }

  const parts = callbackData.split('_');
  if (parts.length !== 3) {
    await ctx.answerCbQuery({ text: 'فرمت داده نامعتبر', show_alert: true });
    return;
  }

  const chargeID = parseInt(parts[2], 10);

  let targetUserID = null;
  let amount = null;
  try {
    const pool = getPool();
    const [charges] = await pool.query(
      'SELECT id, userID, amount, status FROM charges WHERE id = ? LIMIT 1',
      [chargeID]
    );
    if (charges.length === 0) {
      await ctx.answerCbQuery({ text: 'درخواست یافت نشد', show_alert: true });
      return;
    }
    
    const charge = charges[0];
    if (charge.status !== 'pending') {
      await ctx.answerCbQuery({ text: 'این درخواست قبلاً پردازش شده است', show_alert: true });
      return;
    }
    
    targetUserID = charge.userID;
    amount = charge.amount;
  } catch (error) {
    console.error('Error finding charge ID:', error);
    await ctx.answerCbQuery({ text: 'خطا در دریافت اطلاعات', show_alert: true });
    return;
  }

  const chargeKey = `charge_${chargeID}`;
  const adminMessages = adminChargeMessages.get(chargeKey);
  
  const [userInfo] = await pool.query(
    'SELECT name, username FROM users WHERE userID = ? LIMIT 1',
    [targetUserID]
  );
  
  const userName = userInfo[0]?.username || 'بدون یوزرنیم';
  const userFullName = userInfo[0]?.name || 'نامشخص';
  const formattedAmount = amount.toLocaleString('en-US');
  
  const originalCaption = `💰 <b>درخواست شارژ کیف پول</b>

<b>مبلغ:</b> ${formattedAmount} تومان
<b>کاربر:</b> ${userFullName}
<b>یوزرنیم:</b> @${userName}
<b>آیدی:</b> <code>${targetUserID}</code>
<b>شناسه درخواست:</b> <code>${chargeID}</code>`;
  
  if (adminMessages && adminMessages.length > 0) {
    for (const msg of adminMessages) {
      try {
        await ctx.telegram.editMessageCaption(
          msg.chatId,
          msg.messageId,
          {
            caption: originalCaption,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '⏳ در حال رد...', callback_data: 'charge_rejecting_disabled' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        try {
          await ctx.telegram.editMessageReplyMarkup(
            msg.chatId,
            msg.messageId,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '⏳ در حال رد...', callback_data: 'charge_rejecting_disabled' }
                  ]
                ]
              }
            }
          );
        } catch (e) {
          console.log(`[chargeReject] Could not edit admin message for ${msg.adminID}:`, e.message);
        }
      }
    }
  }

  await ctx.answerCbQuery({ text: 'لطفاً دلیل رد را در یک پیام متنی ارسال کنید.' });
  
  try {
    await ctx.reply('❓ <b>دلیل رد شارژ</b>\n\nلطفاً دلیل رد این درخواست شارژ را در یک پیام متنی ارسال کنید:', {
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.log('Could not send reason request message:', error.message);
  }
  
  setRejectState(userID, {
    adminID: userID,
    targetUserID,
    chargeID,
    amount,
    chargeKey
  });
};

