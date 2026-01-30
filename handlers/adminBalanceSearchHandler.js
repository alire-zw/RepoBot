import { getPool } from '../services/database.js';
import { getUserBalance } from '../services/walletService.js';
import { isAdmin } from '../services/admin.js';
import { getBalanceState, setBalanceState, clearBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    return false;
  }

  const text = ctx.message?.text;
  if (!text) {
    return false;
  }

  const state = getBalanceState(userId);
  if (!state) {
    return false;
  }

  if (state.state !== 'searching') {
    return false;
  }

  try {
    const pool = getPool();
    const userID = parseInt(text.trim(), 10);

    if (isNaN(userID)) {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceSearchHandler] Could not delete admin message:', error.message);
      }

      const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

      try {
        const lastMessage = ctx.callbackQuery?.message || ctx.message;
        if (lastMessage && lastMessage.message_id) {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            lastMessage.message_id,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            }
          );
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceSearchHandler] Error editing message:', error);
      }
      return;
    }

    const [user] = await pool.query(
      'SELECT userID, name, username, balance, isBlocked FROM users WHERE userID = ? LIMIT 1',
      [userID]
    );

    if (!user || user.length === 0) {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceSearchHandler] Could not delete admin message:', error.message);
      }

      const requestMessageId = state.requestMessageId;
      const message = `❌ <b>کاربر یافت نشد</b>

کاربری با آیدی <code>${userID}</code> یافت نشد.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceSearchHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceSearchHandler] Error sending message:', error);
      }
      clearBalanceState(userId);
      return true;
    }

    const userData = user[0];
    const balance = await getUserBalance(userID);
    const formattedBalance = balance.toLocaleString('en-US');
    const username = userData.username ? `@${userData.username}` : 'ندارد';
    const isBlocked = userData.isBlocked === 1 || userData.isBlocked === true;
    const blockStatus = isBlocked ? '🔴 مسدود' : '🟢 فعال';
    const blockButtonText = isBlocked ? '✅ انبلاک' : '🚫 بلاک';
    const blockCallbackData = isBlocked ? `admin_unblock_${userID}` : `admin_block_${userID}`;

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('[adminBalanceSearchHandler] Could not delete admin message:', error.message);
    }

    const message = `👤 <b>اطلاعات کاربر</b>

<b>آیدی:</b> <code>${userID}</code>
<b>نام:</b> ${userData.name}
<b>یوزرنیم:</b> ${username}
<b>موجودی:</b> ${formattedBalance} تومان
<b>وضعیت:</b> ${blockStatus}`;

    clearBalanceState(userId);

    const requestMessageId = state.requestMessageId;
    try {
      if (requestMessageId) {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '➕ افزایش موجودی', callback_data: `admin_balance_edit_${userID}` },
                    { text: '➖ کاهش موجودی', callback_data: `admin_balance_decrease_${userID}` }
                  ],
                  [
                    { text: blockButtonText, callback_data: blockCallbackData }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            }
          );
        } catch (editError) {
          console.log('[adminBalanceSearchHandler] Could not edit message, sending new:', editError.message);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '➕ افزایش موجودی', callback_data: `admin_balance_edit_${userID}` },
                  { text: '➖ کاهش موجودی', callback_data: `admin_balance_decrease_${userID}` }
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
        }
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➕ افزایش موجودی', callback_data: `admin_balance_edit_${userID}` },
                { text: '➖ کاهش موجودی', callback_data: `admin_balance_decrease_${userID}` }
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
      }
    } catch (error) {
      console.error('[adminBalanceSearchHandler] Error sending message:', error);
    }
    return true;
  } catch (error) {
    console.error('[adminBalanceSearchHandler] Error:', error);
    await ctx.reply('❌ خطا در جستجوی کاربر. لطفاً دوباره تلاش کنید.');
    clearBalanceState(userId);
    return true;
  }
};

