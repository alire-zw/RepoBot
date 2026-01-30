import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';
import { setBalanceState, getBalanceState, clearBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  console.log('[channelSearchHandler] Handler called with callback_data:', ctx.callbackQuery?.data);

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  let channelID = null;

  // استفاده از ctx.match اگر regex match شده باشد
  if (ctx.match && Array.isArray(ctx.match) && ctx.match.length > 1) {
    channelID = parseInt(ctx.match[1], 10);
    console.log('[channelSearchHandler] Parsed channelID from regex match:', channelID);
  } else if (callbackData && callbackData.startsWith('channel_search_id_')) {
    // استفاده از substring برای استخراج channelID (که ممکن است منفی باشد)
    const idString = callbackData.replace('channel_search_id_', '');
    channelID = parseInt(idString, 10);
    console.log('[channelSearchHandler] Parsed channelID from callback:', channelID, 'from string:', idString);
  } else {
    console.log('[channelSearchHandler] Callback data does not match pattern. Callback:', callbackData);
  }

  // اگر channelID داشتیم، مستقیماً اطلاعات کانال را نمایش می‌دهیم
  if (channelID && !isNaN(channelID)) {
    console.log('[channelSearchHandler] Looking up channel with ID:', channelID);
    const { findChannelByID } = await import('../services/channelService.js');
    const channel = await findChannelByID(channelID);
    
    console.log('[channelSearchHandler] Found channel:', channel);
    
    if (channel) {
      // دریافت تعداد اعضای واقعی از Telegram
      let memberCount = channel.memberCount || 0;
      try {
        const { getChannelRealMemberCount } = await import('../services/channelService.js');
        const realMemberCount = await getChannelRealMemberCount(ctx.telegram, channelID);
        if (realMemberCount !== null) {
          memberCount = realMemberCount;
          // بروزرسانی تعداد اعضا در دیتابیس
          const { getPool } = await import('../services/database.js');
          const pool = getPool();
          await pool.query(
            'UPDATE channels SET memberCount = ? WHERE channelID = ?',
            [memberCount, channelID]
          );
        }
      } catch (error) {
        console.log('[channelSearchHandler] Could not get real member count:', error.message);
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
          console.log('[channelSearchHandler] Message not modified');
        } else {
          console.error('[channelSearchHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }
      }
      return;
    } else {
      console.log('[channelSearchHandler] Channel not found in database');
      await ctx.answerCbQuery({ text: 'کانال یافت نشد', show_alert: true });
      return;
    }
  }

  try {
    const message = `🔍 <b>جستجوی کانال</b>

لطفاً آیدی عددی کانال را ارسال کنید تا وضعیت قفل آن نمایش داده شود.

<b>⚠️ توجه:</b> آیدی باید به صورت عدد باشد.`;

    const keyboard = [
      [
        { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
      ]
    ];

    let requestMessageId;
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });
      requestMessageId = ctx.callbackQuery?.message?.message_id;
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        console.log('[channelSearchHandler] Message not modified');
        requestMessageId = ctx.callbackQuery?.message?.message_id;
      } else {
        console.error('[channelSearchHandler] Error editing message:', error);
        const sentMessage = await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
        requestMessageId = sentMessage.message_id;
      }
    }

    setBalanceState(userId, {
      state: 'searching_channel',
      requestMessageId: requestMessageId
    });

  } catch (error) {
    console.error('[channelSearchHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش جستجو', show_alert: true });
  }
};

