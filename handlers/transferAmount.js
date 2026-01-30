import { getPool } from '../services/database.js';
import { getUserBalance } from '../services/walletService.js';
import { getTransferState, setTransferState } from '../services/transferState.js';

export default async (ctx) => {
  const userId = ctx.from.id;
  const state = getTransferState(userId);

  if (!state) {
    return false;
  }

  const text = ctx.message?.text;
  if (!text) {
    return false;
  }

  try {
    if (state.state === 'waiting_target_user_id') {
      const targetUserID = parseInt(text.trim(), 10);

      if (isNaN(targetUserID)) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[transferAmount] Could not delete user message:', error.message);
        }

        const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[transferAmount] Error editing message:', error);
        }
        return true;
      }

      if (targetUserID === userId) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[transferAmount] Could not delete user message:', error.message);
        }

        const message = `❌ <b>خطا</b>

شما نمی‌توانید موجودی را به خودتان انتقال دهید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[transferAmount] Error editing message:', error);
        }
        return true;
      }

      const pool = getPool();
      const [targetUser] = await pool.query(
        'SELECT userID, name FROM users WHERE userID = ? LIMIT 1',
        [targetUserID]
      );

      if (!targetUser || targetUser.length === 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[transferAmount] Could not delete user message:', error.message);
        }

        const message = `❌ <b>کاربر یافت نشد</b>

کاربری با آیدی <code>${targetUserID}</code> یافت نشد.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[transferAmount] Error editing message:', error);
        }
        return true;
      }

      const targetUserName = targetUser[0].name;
      const userBalance = await getUserBalance(userId);

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[transferAmount] Could not delete user message:', error.message);
      }

      const message = `💸 <b>انتقال موجودی</b>

<b>دریافت‌کننده:</b> ${targetUserName}
<b>آیدی:</b> <code>${targetUserID}</code>
<b>موجودی شما:</b> ${userBalance.toLocaleString('en-US')} تومان

لطفاً مبلغ انتقال را به تومان وارد کنید:`;

      setTransferState(userId, {
        state: 'waiting_amount',
        targetUserID: targetUserID,
        targetUserName: targetUserName,
        requestMessageId: state.requestMessageId
      });

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          state.requestMessageId,
          null,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'my_account' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.error('[transferAmount] Error editing message:', error);
      }

      return true;

    } else if (state.state === 'waiting_amount') {
      const cleanAmount = text.replace(/[,،\s]/g, '');
      const amount = parseInt(cleanAmount, 10);

      if (isNaN(amount) || amount <= 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[transferAmount] Could not delete user message:', error.message);
        }

        const message = `❌ <b>مبلغ نامعتبر</b>

مبلغ وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

موجودی شما: ${(await getUserBalance(userId)).toLocaleString('en-US')} تومان

لطفاً مبلغ انتقال را به تومان وارد کنید:`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[transferAmount] Error editing message:', error);
        }
        return true;
      }

      const userBalance = await getUserBalance(userId);

      if (amount > userBalance) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[transferAmount] Could not delete user message:', error.message);
        }

        const message = `❌ <b>موجودی ناکافی</b>

موجودی شما کافی نیست.

<b>موجودی شما:</b> ${userBalance.toLocaleString('en-US')} تومان
<b>مبلغ درخواستی:</b> ${amount.toLocaleString('en-US')} تومان

لطفاً مبلغ کمتری وارد کنید:`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[transferAmount] Error editing message:', error);
        }
        return true;
      }

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[transferAmount] Could not delete user message:', error.message);
      }

      const formattedAmount = amount.toLocaleString('en-US');
      const message = `💸 <b>تایید انتقال موجودی</b>

<b>دریافت‌کننده:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>
<b>مبلغ:</b> ${formattedAmount} تومان

آیا از انتقال این مبلغ اطمینان دارید؟`;

      setTransferState(userId, {
        state: 'waiting_confirm',
        targetUserID: state.targetUserID,
        targetUserName: state.targetUserName,
        amount: amount,
        requestMessageId: state.requestMessageId
      });

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          state.requestMessageId,
          null,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ تایید', callback_data: 'transfer_confirm' },
                  { text: '❌ انصراف', callback_data: 'transfer_cancel' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.error('[transferAmount] Error editing message:', error);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[transferAmount] Error:', error);
    return false;
  }
};

