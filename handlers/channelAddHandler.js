import { isAdmin } from '../services/admin.js';
import { setChannelAddingState } from '../services/channelState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const message = `📢 <b>افزودن کانال</b>

لطفاً یک یا چند پیام از کانال مورد نظر را به ربات <b>Forward</b> کنید.

<b>⚠️ نکات مهم:</b>
• ربات باید در کانال <b>ادمین</b> باشد
• پیام باید از کانال باشد (نه از گروه یا چت خصوصی)
• می‌توانید چندین پیام را forward کنید تا همه کانال‌های جدید نمایش داده شوند
• برای لغو، روی دکمه بازگشت کلیک کنید`;

    const keyboard = [
      [
        { text: '🔙 بازگشت', callback_data: 'channel_management' }
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
        console.log('[channelAddHandler] Message not modified');
        requestMessageId = ctx.callbackQuery?.message?.message_id;
      } else {
        console.error('[channelAddHandler] Error editing message:', error);
        const sentMessage = await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
        requestMessageId = sentMessage.message_id;
      }
    }

    setChannelAddingState(userId, {
      state: 'waiting_forward',
      requestMessageId: requestMessageId
    });

    console.log('[channelAddHandler] State set for user:', userId, {
      state: 'waiting_forward',
      requestMessageId: requestMessageId
    });
  } catch (error) {
    console.error('[channelAddHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در افزودن کانال', show_alert: true });
  }
};

