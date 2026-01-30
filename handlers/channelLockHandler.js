import { getPool } from '../services/database.js';
import { findChannelByID, updateChannelLockStatus } from '../services/channelService.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  let answered = false;
  const answerQuery = async (text = '', showAlert = false) => {
    if (!answered) {
      try {
        await ctx.answerCbQuery(text ? { text, show_alert: showAlert } : {});
        answered = true;
      } catch (error) {
        console.log('[channelLockHandler] Error answering callback query:', error.message);
      }
    }
  };

  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await answerQuery('شما دسترسی ندارید', true);
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData) {
    return;
  }

  let channelID = null;

  if (ctx.match && Array.isArray(ctx.match) && ctx.match.length > 1) {
    channelID = parseInt(ctx.match[1], 10);
  } else if (callbackData && callbackData.startsWith('channel_lock_')) {
    const idString = callbackData.replace('channel_lock_', '');
    channelID = parseInt(idString, 10);
  }

  if (!channelID || isNaN(channelID)) {
    await answerQuery('کانال یافت نشد', true);
    return;
  }

  try {
    await answerQuery(); // Answer the initial query

    const pool = getPool();
    const [channel] = await pool.query(
      'SELECT id, channelID, channelName, channelUsername, isLocked FROM channels WHERE channelID = ? LIMIT 1',
      [channelID]
    );

    if (!channel || channel.length === 0) {
      await answerQuery('کانال یافت نشد', true);
      return;
    }

    const channelData = channel[0];
    const isLocked = channelData.isLocked === 1 || channelData.isLocked === true;
    const newLockStatus = !isLocked;

    await updateChannelLockStatus(channelID, newLockStatus);

    const actionText = newLockStatus ? 'قفل شد' : 'باز شد';
    await answerQuery(`کانال ${actionText}`, false);

    // دریافت اطلاعات بروزرسانی شده
    const updatedChannel = await findChannelByID(channelID);
    if (!updatedChannel) {
      await answerQuery('خطا در دریافت اطلاعات کانال', true);
      return;
    }

    // دریافت تعداد اعضای واقعی از Telegram
    let memberCount = updatedChannel.memberCount || 0;
    try {
      const { getChannelRealMemberCount } = await import('../services/channelService.js');
      const realMemberCount = await getChannelRealMemberCount(ctx.telegram, channelID);
      if (realMemberCount !== null) {
        memberCount = realMemberCount;
        // بروزرسانی تعداد اعضا در دیتابیس
        await pool.query(
          'UPDATE channels SET memberCount = ? WHERE channelID = ?',
          [memberCount, channelID]
        );
      }
    } catch (error) {
      console.log('[channelLockHandler] Could not get real member count:', error.message);
    }

    const channelName = channelData.channelName || 'کانال';
    const username = channelData.channelUsername ? `@${channelData.channelUsername}` : 'ندارد';
    const updatedLockStatus = updatedChannel.isLocked === 1 || updatedChannel.isLocked === true;
    const updatedLockStatusText = updatedLockStatus ? '🔒 قفل' : '🔓 باز';
    const updatedLockButtonText = updatedLockStatus ? '🔓 باز کردن قفل' : '🔒 قفل کردن';
    const updatedLockCallbackData = updatedLockStatus ? `channel_unlock_${channelID}` : `channel_lock_${channelID}`;
    const formattedMemberCount = memberCount.toLocaleString('en-US');

    const message = `📢 <b>اطلاعات کانال</b>

<b>نام:</b> ${channelName}
<b>یوزرنیم:</b> ${username}
<b>آیدی:</b> <code>${channelID}</code>
<b>وضعیت قفل:</b> ${updatedLockStatusText}
<b>تعداد اعضا:</b> ${formattedMemberCount}
<b>لیبل دکمه:</b> ${updatedChannel.buttonLabel || 'تایید عضویت'}`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: updatedLockButtonText, callback_data: updatedLockCallbackData },
              { text: '✏️ ویرایش لیبل', callback_data: `channel_edit_label_${channelID}` }
            ],
            [
              { text: '🗑️ حذف کانال', callback_data: `channel_delete_${channelID}` }
            ],
            [
              { text: '🔙 بازگشت', callback_data: 'channel_list' }
            ]
          ]
        }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        console.log('[channelLockHandler] Message not modified');
      } else {
        console.error('[channelLockHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: updatedLockButtonText, callback_data: updatedLockCallbackData },
                { text: '✏️ ویرایش لیبل', callback_data: `channel_edit_label_${channelID}` }
              ],
              [
                { text: '🗑️ حذف کانال', callback_data: `channel_delete_${channelID}` }
              ],
              [
                { text: '🔙 بازگشت', callback_data: 'channel_list' }
              ]
            ]
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelLockHandler] Error:', error);
    await answerQuery('خطا در تغییر وضعیت قفل', true);
  }
};

