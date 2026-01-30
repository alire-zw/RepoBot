import { findChannelByID } from '../services/channelService.js';
import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';
import { setBalanceState, getBalanceState, clearBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  let channelID = null;

  if (callbackData && callbackData.startsWith('channel_edit_label_')) {
    const idString = callbackData.replace('channel_edit_label_', '');
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

    const message = `✏️ <b>ویرایش لیبل دکمه</b>

<b>کانال:</b> ${channel.channelName}
<b>لیبل فعلی:</b> ${channel.buttonLabel || 'تایید عضویت'}

لطفاً لیبل جدید دکمه را ارسال کنید:`;

    setBalanceState(userId, {
      state: 'waiting_channel_label',
      step: 'channel_label',
      channelID: channelID,
      channelName: channel.channelName,
      requestMessageId: ctx.callbackQuery?.message?.message_id || null
    });

    const keyboard = [
      [
        { text: '🔙 بازگشت', callback_data: `channel_detail_${channelID}` }
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
        console.log('[channelEditLabelHandler] Message not modified');
      } else {
        console.error('[channelEditLabelHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelEditLabelHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در ویرایش لیبل', show_alert: true });
  }
};

