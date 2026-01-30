import { findChannelByID, getChannelRealMemberCount } from '../services/channelService.js';
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
  let channelID = null;

  // استخراج channelID از callback_data
  if (ctx.match && Array.isArray(ctx.match) && ctx.match.length > 1) {
    channelID = parseInt(ctx.match[1], 10);
  } else if (callbackData && callbackData.startsWith('channel_detail_')) {
    const idString = callbackData.replace('channel_detail_', '');
    channelID = parseInt(idString, 10);
  }

  if (!channelID || isNaN(channelID)) {
    await ctx.answerCbQuery({ text: 'آیدی کانال نامعتبر است', show_alert: true });
    return;
  }

  try {
    const channel = await findChannelByID(channelID);
    
    if (!channel) {
      await ctx.answerCbQuery({ text: 'کانال یافت نشد', show_alert: true });
      return;
    }

    // دریافت تعداد اعضای واقعی از Telegram
    let memberCount = channel.memberCount || 0;
    try {
      const realMemberCount = await getChannelRealMemberCount(ctx.telegram, channelID);
      if (realMemberCount !== null) {
        memberCount = realMemberCount;
        // بروزرسانی تعداد اعضا در دیتابیس
        const pool = getPool();
        await pool.query(
          'UPDATE channels SET memberCount = ? WHERE channelID = ?',
          [memberCount, channelID]
        );
      }
    } catch (error) {
      console.log('[channelDetailHandler] Could not get real member count:', error.message);
    }

    const isLocked = channel.isLocked === 1 || channel.isLocked === true;
    const lockStatusText = isLocked ? '🔒 قفل' : '🔓 باز';
    const lockButtonText = isLocked ? '🔓 باز کردن قفل' : '🔒 قفل کردن';
    const lockCallbackData = isLocked ? `channel_unlock_${channelID}` : `channel_lock_${channelID}`;
    const username = channel.channelUsername ? `@${channel.channelUsername}` : 'ندارد';
    const formattedMemberCount = memberCount.toLocaleString('en-US');

    const message = `📢 <b>اطلاعات کانال</b>

<b>نام:</b> ${channel.channelName}
<b>یوزرنیم:</b> ${username}
<b>آیدی:</b> <code>${channelID}</code>
<b>وضعیت قفل:</b> ${lockStatusText}
<b>تعداد اعضا:</b> ${formattedMemberCount}
<b>لیبل دکمه:</b> ${channel.buttonLabel || 'تایید عضویت'}`;

    const keyboard = [
      [
        { text: lockButtonText, callback_data: lockCallbackData },
        { text: '✏️ ویرایش لیبل', callback_data: `channel_edit_label_${channelID}` }
      ],
      [
        { text: '🗑️ حذف کانال', callback_data: `channel_delete_${channelID}` }
      ],
      [
        { text: '🔙 بازگشت', callback_data: 'channel_list' }
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
        console.log('[channelDetailHandler] Message not modified');
      } else {
        console.error('[channelDetailHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelDetailHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش اطلاعات کانال', show_alert: true });
  }
};

