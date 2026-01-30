import { getPool } from '../services/database.js';
import { findChannelByID } from '../services/channelService.js';
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

  if (callbackData && callbackData.startsWith('channel_delete_')) {
    const idString = callbackData.replace('channel_delete_', '');
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

    const message = `🗑️ <b>حذف کانال</b>

<b>کانال:</b> ${channel.channelName}
<b>یوزرنیم:</b> ${channel.channelUsername ? `@${channel.channelUsername}` : 'ندارد'}
<b>آیدی:</b> <code>${channelID}</code>

⚠️ آیا مطمئن هستید که می‌خواهید این کانال را حذف کنید؟`;

    const keyboard = [
      [
        { text: '✅ بله، حذف کن', callback_data: `channel_delete_confirm_${channelID}` },
        { text: '❌ خیر، لغو', callback_data: `channel_detail_${channelID}` }
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
        console.log('[channelDeleteHandler] Message not modified');
      } else {
        console.error('[channelDeleteHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelDeleteHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در حذف کانال', show_alert: true });
  }
};

