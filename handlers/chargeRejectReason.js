import config from '../config/env.js';
import { isAdmin } from '../services/admin.js';
import { getPool } from '../services/database.js';
import { adminChargeMessages } from './chargeReceipt.js';
import { getRejectState, clearRejectState, getAllRejectStates } from '../services/rejectState.js';

export default async (ctx) => {
  const userID = ctx.from.id;
  if (!isAdmin(userID)) {
    return false;
  }

  const state = getRejectState(userID);
  if (state && state.adminID === userID) {
    const text = ctx.message?.text;
    if (!text) {
      return false;
    }

    try {
      const pool = getPool();
      if (state.chargeID) {
        await pool.query(
          'UPDATE charges SET status = ?, rejectedBy = ?, rejectReason = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          ['rejected', userID, text, state.chargeID]
        );
      }

        const adminMessages = state.chargeKey ? adminChargeMessages.get(state.chargeKey) : null;
        
        let originalCaption = '';
        if (state.chargeID && state.targetUserID && state.amount) {
          const [userInfo] = await pool.query(
            'SELECT name, username FROM users WHERE userID = ? LIMIT 1',
            [state.targetUserID]
          );
          
          const userName = userInfo[0]?.username || 'بدون یوزرنیم';
          const userFullName = userInfo[0]?.name || 'نامشخص';
          const formattedAmount = state.amount.toLocaleString('en-US');
          
          originalCaption = `💰 <b>درخواست شارژ کیف پول</b>

<b>مبلغ:</b> ${formattedAmount} تومان
<b>کاربر:</b> ${userFullName}
<b>یوزرنیم:</b> @${userName}
<b>آیدی:</b> <code>${state.targetUserID}</code>
<b>شناسه درخواست:</b> <code>${state.chargeID}</code>`;
        }
        
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
                        { text: '❌ رد شده', callback_data: 'charge_rejected_disabled' }
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
                          { text: '❌ رد شده', callback_data: 'charge_rejected_disabled' }
                        ]
                      ]
                    }
                  }
                );
              } catch (e) {
                console.log(`[chargeRejectReason] Could not edit admin message for ${msg.adminID}:`, e.message);
              }
            }
          }
          if (state.chargeKey) {
            adminChargeMessages.delete(state.chargeKey);
          }
        }

      await ctx.telegram.sendMessage(
        state.targetUserID,
        `❌ <b>شارژ کیف پول رد شد</b>\n\n<b>دلیل:</b> ${text}`,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '💵 افزایش موجودی', callback_data: 'charge_wallet' }
              ]
            ]
          }
        }
      );

      clearRejectState(userID);

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('Could not delete admin message:', error.message);
      }

      await ctx.reply('✅ پیام رد به کاربر ارسال شد.');
      return true;
    } catch (error) {
      console.error('Error in chargeRejectReason:', error);
      await ctx.reply('❌ خطا در ارسال پیام رد.');
      return true;
    }
  }

  return false;
};

