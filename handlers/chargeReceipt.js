import config from '../config/env.js';
import { getChargeState, clearChargeState } from '../services/chargeState.js';
import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';

const adminChargeMessages = new Map();

export default async (ctx) => {
  const userId = ctx.from.id;
  const state = getChargeState(userId);
  
  if (!state || state.state !== 'waiting_receipt') {
    return;
  }

  const photo = ctx.message?.photo;
  if (!photo || photo.length === 0) {
    await ctx.reply('❌ لطفاً تصویر رسید پرداخت را ارسال کنید.');
    return;
  }

  try {
    const pool = getPool();
    const [user] = await pool.query(
      'SELECT name, username FROM users WHERE userID = ? LIMIT 1',
      [userId]
    );

    const userName = user[0]?.username || 'بدون یوزرنیم';
    const userFullName = user[0]?.name || 'نامشخص';
    const formattedAmount = state.amount.toLocaleString('en-US');

    const cardNumber = state.cardNumber || '';
    const cardName = state.cardName || '';

    let chargeID = null;
    try {
      const [chargeResult] = await pool.execute(
        `INSERT INTO charges (userID, amount, cardNumber, cardName, status) 
         VALUES (?, ?, ?, ?, 'pending')`,
        [userId, state.amount, cardNumber, cardName]
      );
      chargeID = chargeResult.insertId;
    } catch (error) {
      console.error('Error saving charge:', error);
      await ctx.reply('❌ خطا در ذخیره درخواست. لطفاً دوباره تلاش کنید.');
      return;
    }

    if (!chargeID) {
      await ctx.reply('❌ خطا در ثبت درخواست. لطفاً دوباره تلاش کنید.');
      return;
    }

    const adminMessage = `💰 <b>درخواست شارژ کیف پول</b>

<b>مبلغ:</b> ${formattedAmount} تومان
<b>کاربر:</b> ${userFullName}
<b>یوزرنیم:</b> @${userName}
<b>آیدی:</b> <code>${userId}</code>
<b>شناسه درخواست:</b> <code>${chargeID}</code>`;

    const fileId = photo[photo.length - 1].file_id;
    const chargeKey = `charge_${chargeID}`;
    const adminMessages = [];
    
    for (const adminID of config.ADMINS) {
      try {
        const sentMessage = await ctx.telegram.sendPhoto(adminID, fileId, {
          caption: adminMessage,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ تایید', callback_data: `charge_approve_${chargeID}` },
                { text: '❌ رد', callback_data: `charge_reject_${chargeID}` }
              ]
            ]
          }
        });
        
        if (sentMessage && sentMessage.message_id && sentMessage.chat) {
          adminMessages.push({
            adminID,
            messageId: sentMessage.message_id,
            chatId: sentMessage.chat.id
          });
        }
      } catch (error) {
        const isBlocked = error?.error_code === 403 && 
          (error?.description?.includes('bot was blocked') || error?.message?.includes('bot was blocked'));
        if (!isBlocked) {
          console.error(`Error sending to admin ${adminID}:`, error.message);
        }
      }
    }
    
    if (adminMessages.length > 0) {
      adminChargeMessages.set(chargeKey, adminMessages);
      console.log(`Saved ${adminMessages.length} admin messages for key: ${chargeKey}`);
    } else {
      console.error(`No admin messages to save for key: ${chargeKey}`);
    }

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('Could not delete user message:', error.message);
    }

    const stateMessageId = state.messageId || state.requestMessageId;
    const confirmationMessage = `✅ <b>رسید دریافت شد</b>

رسید پرداخت شما با موفقیت به ادمین‌ها ارسال شد و در اسرع وقت تایید خواهد شد.

<b>⏱️ زمان تخمینی انتظار:</b> 15 دقیقه`;

    if (stateMessageId) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          stateMessageId,
          null,
          confirmationMessage,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.log('Could not edit message, sending new one:', error.message);
        await ctx.reply(confirmationMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }
              ]
            ]
          }
        });
      }
    } else {
      await ctx.reply(confirmationMessage, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔙 بازگشت به منو', callback_data: 'back_to_main' }
            ]
          ]
        }
      });
    }

    clearChargeState(userId);

  } catch (error) {
    console.error('Error in chargeReceipt:', error);
    await ctx.reply('❌ خطا در ارسال رسید. لطفاً دوباره تلاش کنید.');
  }
};

export { adminChargeMessages };

