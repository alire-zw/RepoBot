import { getPool } from '../services/database.js';
import { getUserBalance, updateUserBalance } from '../services/walletService.js';
import { getTransferState, clearTransferState } from '../services/transferState.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const state = getTransferState(userId);

  if (!state || state.state !== 'waiting_confirm') {
    await ctx.answerCbQuery({ text: 'درخواست نامعتبر', show_alert: true });
    return;
  }

  const adminUser = isAdmin(userId);

  try {
    const userBalance = await getUserBalance(userId);

    if (state.amount > userBalance) {
      await ctx.answerCbQuery({ text: 'موجودی شما کافی نیست', show_alert: true });
      clearTransferState(userId);
      
      const message = `❌ <b>خطا</b>

موجودی شما کافی نیست.`;

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت به حساب کاربری', callback_data: 'my_account' }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('[transferConfirm] Error editing message:', error);
      }
      return;
    }

    const pool = getPool();
    const [targetUser] = await pool.query(
      'SELECT userID, name FROM users WHERE userID = ? LIMIT 1',
      [state.targetUserID]
    );

    if (!targetUser || targetUser.length === 0) {
      await ctx.answerCbQuery({ text: 'کاربر یافت نشد', show_alert: true });
      clearTransferState(userId);
      
      const message = `❌ <b>خطا</b>

کاربر یافت نشد.`;

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت به حساب کاربری', callback_data: 'my_account' }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('[transferConfirm] Error editing message:', error);
      }
      return;
    }

    // کسر از فرستنده
    await updateUserBalance(userId, -state.amount);
    
    // اضافه به دریافت‌کننده
    await updateUserBalance(state.targetUserID, state.amount);

    const formattedAmount = state.amount.toLocaleString('en-US');
    const newBalance = await getUserBalance(userId);
    const formattedNewBalance = newBalance.toLocaleString('en-US');

    const senderMessage = adminUser 
      ? `✅ <b>انتقال موجودی انجام شد</b>

<b>مبلغ:</b> ${formattedAmount} تومان
<b>به آیدی:</b> <code>${state.targetUserID}</code>
<b>با نام:</b> ${state.targetUserName}`
      : `✅ <b>انتقال موجودی انجام شد</b>

<b>مبلغ:</b> ${formattedAmount} تومان
<b>دریافت‌کننده:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>
<b>موجودی جدید شما:</b> ${formattedNewBalance} تومان`;

    clearTransferState(userId);

    try {
      if (adminUser) {
        // اگر ادمین است، پیام جدید ارسال می‌کنیم
        await ctx.reply(senderMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت به حساب کاربری', callback_data: 'my_account' }
              ]
            ]
          }
        });
      } else {
        // اگر کاربر عادی است، پیام قبلی را ادیت می‌کنیم
        await ctx.editMessageText(senderMessage, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت به حساب کاربری', callback_data: 'my_account' }
              ]
            ]
          }
        });
      }
    } catch (error) {
      console.error('[transferConfirm] Error editing/sending message:', error);
    }

    // ارسال پیام به دریافت‌کننده
    const receiverMessage = `💰 <b>موجودی شما افزایش یافت</b>

حساب کاربری شما به مبلغ <b>${formattedAmount} تومان</b> افزایش پیدا کرد.`;

    try {
      await ctx.telegram.sendMessage(
        state.targetUserID,
        receiverMessage,
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '👤 حساب کاربری من', callback_data: 'my_account' }
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error('[transferConfirm] Error sending message to receiver:', error);
    }

  } catch (error) {
    console.error('[transferConfirm] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در انتقال موجودی', show_alert: true });
    clearTransferState(userId);
  }
};

