import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';
import { getBalanceState, clearBalanceState } from './adminBalanceManagement.js';

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

  if (state.state !== 'searching_channel') {
    return false;
  }

  try {
    const pool = getPool();
    const channelID = parseInt(text.trim(), 10);

    if (isNaN(channelID)) {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[channelSearchHandlerText] Could not delete admin message:', error.message);
      }

      const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کانال را ارسال کنید:`;

      try {
        const requestMessageId = state.requestMessageId;
        if (requestMessageId) {
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
        } else {
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
      } catch (error) {
        console.error('[channelSearchHandlerText] Error editing message:', error);
      }
      return true;
    }

    const [channel] = await pool.query(
      'SELECT id, channelID, channelName, channelUsername, isLocked FROM channels WHERE channelID = ? LIMIT 1',
      [channelID]
    );

    if (!channel || channel.length === 0) {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[channelSearchHandlerText] Could not delete admin message:', error.message);
      }

      const requestMessageId = state.requestMessageId;
      const message = `❌ <b>کانال یافت نشد</b>

کانالی با آیدی <code>${channelID}</code> یافت نشد.

لطفاً آیدی عددی کانال را ارسال کنید:`;

      try {
        if (requestMessageId) {
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
        } else {
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
      } catch (error) {
        console.error('[channelSearchHandlerText] Error sending message:', error);
      }
      clearBalanceState(userId);
      return true;
    }

    const channelData = channel[0];
    const isLocked = channelData.isLocked === 1 || channelData.isLocked === true;
    const lockStatus = isLocked ? '🔒 قفل' : '🔓 باز';
    const lockButtonText = isLocked ? '🔓 باز کردن قفل' : '🔒 قفل کردن';
    const lockCallbackData = isLocked ? `channel_unlock_${channelID}` : `channel_lock_${channelID}`;
    const channelName = channelData.channelName || 'کانال';
    const username = channelData.channelUsername ? `@${channelData.channelUsername}` : 'ندارد';

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('[channelSearchHandlerText] Could not delete admin message:', error.message);
    }

    const message = `📢 <b>اطلاعات کانال</b>

<b>نام:</b> ${channelName}
<b>یوزرنیم:</b> ${username}
<b>آیدی:</b> <code>${channelID}</code>
<b>وضعیت قفل:</b> ${lockStatus}`;

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
                    { text: lockButtonText, callback_data: lockCallbackData }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            }
          );
        } catch (editError) {
          console.log('[channelSearchHandlerText] Could not edit message, sending new:', editError.message);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: lockButtonText, callback_data: lockCallbackData }
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
                { text: lockButtonText, callback_data: lockCallbackData }
              ],
              [
                { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
              ]
            ]
          }
        });
      }
    } catch (error) {
      console.error('[channelSearchHandlerText] Error sending message:', error);
    }
    return true;
  } catch (error) {
    console.error('[channelSearchHandlerText] Error:', error);
    await ctx.reply('❌ خطا در جستجوی کانال. لطفاً دوباره تلاش کنید.');
    clearBalanceState(userId);
    return true;
  }
};

