import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) {
    return;
  }

  let targetUserID = null;
  let isBlockAction = false;

  if (callbackData.startsWith('admin_block_')) {
    const parts = callbackData.split('_');
    targetUserID = parseInt(parts[parts.length - 1], 10);
    isBlockAction = true;
  } else if (callbackData.startsWith('admin_unblock_')) {
    const parts = callbackData.split('_');
    targetUserID = parseInt(parts[parts.length - 1], 10);
    isBlockAction = false;
  }

  if (!targetUserID || isNaN(targetUserID)) {
    await ctx.answerCbQuery({ text: 'کاربر یافت نشد', show_alert: true });
    return;
  }

  try {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET isBlocked = ? WHERE userID = ?',
      [isBlockAction ? 1 : 0, targetUserID]
    );

    const [user] = await pool.query(
      'SELECT userID, name, username, isBlocked FROM users WHERE userID = ? LIMIT 1',
      [targetUserID]
    );

    if (!user || user.length === 0) {
      await ctx.answerCbQuery({ text: 'کاربر یافت نشد', show_alert: true });
      return;
    }

    const userData = user[0];
    const actionText = isBlockAction ? 'مسدود شد' : 'رفع مسدودیت شد';
    
    await ctx.answerCbQuery({ text: `کاربر ${actionText}`, show_alert: false });

    // Refresh the user info page
    const { getUserBalance } = await import('../services/walletService.js');
    const balance = await getUserBalance(targetUserID);
    const formattedBalance = balance.toLocaleString('en-US');
    const username = userData.username ? `@${userData.username}` : 'ندارد';
    const isBlocked = userData.isBlocked === 1 || userData.isBlocked === true;
    const blockStatus = isBlocked ? '🔴 مسدود' : '🟢 فعال';
    const blockButtonText = isBlocked ? '✅ انبلاک' : '🚫 بلاک';
    const blockCallbackData = isBlocked ? `admin_unblock_${targetUserID}` : `admin_block_${targetUserID}`;

    const message = `👤 <b>اطلاعات کاربر</b>

<b>آیدی:</b> <code>${targetUserID}</code>
<b>نام:</b> ${userData.name}
<b>یوزرنیم:</b> ${username}
<b>موجودی:</b> ${formattedBalance} تومان
<b>وضعیت:</b> ${blockStatus}`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '➕ افزایش موجودی', callback_data: `admin_balance_edit_${targetUserID}` },
              { text: '➖ کاهش موجودی', callback_data: `admin_balance_decrease_${targetUserID}` }
            ],
            [
              { text: blockButtonText, callback_data: blockCallbackData }
            ],
            [
              { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('[adminBlockUser] Error editing message:', error);
    }
  } catch (error) {
    console.error('[adminBlockUser] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در انجام عملیات', show_alert: true });
  }
};

