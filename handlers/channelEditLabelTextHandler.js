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
  if (!state || state.state !== 'waiting_channel_label') {
    return false;
  }

  try {
    const label = text.trim();

    if (label.length === 0 || label.length > 255) {
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[channelEditLabelTextHandler] Could not delete admin message:', error.message);
      }

      const message = `❌ <b>لیبل نامعتبر</b>

لیبل نباید خالی باشد و حداکثر 255 کاراکتر باشد.

لطفاً لیبل جدید دکمه را ارسال کنید:`;

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
                    { text: '🔙 بازگشت', callback_data: `channel_detail_${state.channelID}` }
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
                  { text: '🔙 بازگشت', callback_data: `channel_detail_${state.channelID}` }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[channelEditLabelTextHandler] Error editing message:', error);
      }
      return true;
    }

    const pool = getPool();
    await pool.query(
      'UPDATE channels SET buttonLabel = ? WHERE channelID = ?',
      [label, state.channelID]
    );

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('[channelEditLabelTextHandler] Could not delete admin message:', error.message);
    }

    clearBalanceState(userId);

    // نمایش پیام موفقیت و برگشت به صفحه کانال
    const { findChannelByID, getChannelRealMemberCount } = await import('../services/channelService.js');
    const updatedChannel = await findChannelByID(state.channelID);
    
    if (updatedChannel) {
      let memberCount = updatedChannel.memberCount || 0;
      try {
        const realMemberCount = await getChannelRealMemberCount(ctx.telegram, state.channelID);
        if (realMemberCount !== null) {
          memberCount = realMemberCount;
          await pool.query(
            'UPDATE channels SET memberCount = ? WHERE channelID = ?',
            [memberCount, state.channelID]
          );
        }
      } catch (error) {
        console.log('[channelEditLabelTextHandler] Could not get real member count:', error.message);
      }

      const isLocked = updatedChannel.isLocked === 1 || updatedChannel.isLocked === true;
      const lockStatusText = isLocked ? '🔒 قفل' : '🔓 باز';
      const lockButtonText = isLocked ? '🔓 باز کردن قفل' : '🔒 قفل کردن';
      const lockCallbackData = isLocked ? `channel_unlock_${state.channelID}` : `channel_lock_${state.channelID}`;
      const username = updatedChannel.channelUsername ? `@${updatedChannel.channelUsername}` : 'ندارد';
      const formattedMemberCount = memberCount.toLocaleString('en-US');

      const message = `✅ <b>لیبل به‌روزرسانی شد</b>

<b>کانال:</b> ${updatedChannel.channelName}
<b>لیبل جدید:</b> ${label}

📢 <b>اطلاعات کانال</b>

<b>نام:</b> ${updatedChannel.channelName}
<b>یوزرنیم:</b> ${username}
<b>آیدی:</b> <code>${state.channelID}</code>
<b>وضعیت قفل:</b> ${lockStatusText}
<b>تعداد اعضا:</b> ${formattedMemberCount}
<b>لیبل دکمه:</b> ${label}`;

      const keyboard = [
        [
          { text: lockButtonText, callback_data: lockCallbackData },
          { text: '✏️ ویرایش لیبل', callback_data: `channel_edit_label_${state.channelID}` }
        ],
        [
          { text: '🗑️ حذف کانال', callback_data: `channel_delete_${state.channelID}` }
        ],
        [
          { text: '🔙 بازگشت', callback_data: 'channel_list' }
        ]
      ];

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
                inline_keyboard: keyboard
              }
            }
          );
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }
      } catch (error) {
        console.error('[channelEditLabelTextHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error('[channelEditLabelTextHandler] Error:', error);
    await ctx.reply('❌ خطا در بروزرسانی لیبل. لطفاً دوباره تلاش کنید.');
    clearBalanceState(userId);
    return true;
  }
};

