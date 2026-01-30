import config from '../config/env.js';
import { isAdmin } from '../services/admin.js';
import { updateUserBalance } from '../services/walletService.js';
import { getPool } from '../services/database.js';
import { adminChargeMessages } from './chargeReceipt.js';

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

    const targetUserID = charge.userID;
    const amount = charge.amount;

    await pool.query(
      'UPDATE charges SET status = ?, approvedBy = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      ['approved', userID, chargeID]
    );

    await updateUserBalance(targetUserID, amount);

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
                    { text: '✅ تایید شده', callback_data: 'charge_approved_disabled' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error(`[chargeApprove] Error editing caption for admin ${msg.adminID}:`, error.message);
          try {
            await ctx.telegram.editMessageReplyMarkup(
              msg.chatId,
              msg.messageId,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ تایید شده', callback_data: 'charge_approved_disabled' }
                    ]
                  ]
                }
              }
            );
          } catch (e) {
            console.error(`[chargeApprove] Error editing reply markup for admin ${msg.adminID}:`, e.message);
          }
        }
      }
      
      adminChargeMessages.delete(chargeKey);
    } else {
      const callbackMessage = ctx.callbackQuery?.message;
      if (callbackMessage && callbackMessage.photo) {
        try {
          await ctx.telegram.editMessageCaption(
            callbackMessage.chat.id,
            callbackMessage.message_id,
            {
              caption: originalCaption,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '✅ تایید شده', callback_data: 'charge_approved_disabled' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[chargeApprove] Error editing callback message caption:', error.message);
          try {
            await ctx.telegram.editMessageReplyMarkup(
              callbackMessage.chat.id,
              callbackMessage.message_id,
              {
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '✅ تایید شده', callback_data: 'charge_approved_disabled' }
                    ]
                  ]
                }
              }
            );
          } catch (e) {
            console.error('[chargeApprove] Error editing callback message reply markup:', e.message);
          }
        }
      }
    }

    await ctx.telegram.sendMessage(
      targetUserID,
      `✅ <b>شارژ کیف پول تایید شد</b>\n\nمبلغ ${formattedAmount} تومان به کیف پول شما اضافه شد.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🛒 خرید اشتراک جدید', callback_data: 'buy_subscription' }
            ]
          ]
        }
      }
    );

    await ctx.answerCbQuery({ text: 'شارژ تایید شد' });
  } catch (error) {
    console.error('Error in chargeApprove:', error);
    await ctx.answerCbQuery({ text: 'خطا در تایید شارژ', show_alert: true });
  }
};

