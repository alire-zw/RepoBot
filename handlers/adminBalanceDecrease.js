import { getPool } from '../services/database.js';
import { getUserBalance } from '../services/walletService.js';
import { isAdmin } from '../services/admin.js';
import { setBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  let targetUserID = null;

  if (callbackData && callbackData.startsWith('admin_balance_decrease_')) {
    const parts = callbackData.split('_');
    targetUserID = parseInt(parts[parts.length - 1], 10);
  }

  try {
    let message = `➖ <b>کاهش موجودی کاربر</b>`;

    if (targetUserID && !isNaN(targetUserID)) {
      const pool = getPool();
      const [user] = await pool.query(
        'SELECT userID, name, username FROM users WHERE userID = ? LIMIT 1',
        [targetUserID]
      );

      if (user && user.length > 0) {
        const userData = user[0];
        const balance = await getUserBalance(targetUserID);
        const formattedBalance = balance.toLocaleString('en-US');
        const username = userData.username ? `@${userData.username}` : 'ندارد';

        message = `➖ <b>کاهش موجودی کاربر</b>

<b>کاربر:</b> ${userData.name}
<b>آیدی:</b> <code>${targetUserID}</code>
<b>یوزرنیم:</b> ${username}
<b>موجودی فعلی:</b> ${formattedBalance} تومان

لطفاً مبلغ کاهش را به تومان وارد کنید:`;

        setBalanceState(userId, {
          state: 'waiting_decrease_amount',
          step: 'decrease_amount',
          targetUserID: targetUserID,
          targetUserName: userData.name,
          requestMessageId: ctx.callbackQuery?.message?.message_id || null
        });
      } else {
        message = `➖ <b>کاهش موجودی کاربر</b>

لطفاً آیدی عددی کاربر را ارسال کنید تا موجودی وی کاهش یابد.

<b>⚠️ توجه:</b> آیدی باید به صورت عدد باشد.`;

        setBalanceState(userId, {
          state: 'waiting_user_id_decrease',
          step: 'user_id',
          requestMessageId: ctx.callbackQuery?.message?.message_id || null
        });
      }
    } else {
      message = `➖ <b>کاهش موجودی کاربر</b>

لطفاً آیدی عددی کاربر را ارسال کنید تا موجودی وی کاهش یابد.

<b>⚠️ توجه:</b> آیدی باید به صورت عدد باشد.`;

      setBalanceState(userId, {
        state: 'waiting_user_id_decrease',
        step: 'user_id',
        requestMessageId: ctx.callbackQuery?.message?.message_id || null
      });
    }

    const keyboard = [
      [
        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
      ]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        console.log('[adminBalanceDecrease] Message not modified');
      } else {
        console.error('[adminBalanceDecrease] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[adminBalanceDecrease] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش کاهش موجودی', show_alert: true });
  }
};

