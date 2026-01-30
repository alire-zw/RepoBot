import { setTransferState } from '../services/transferState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  try {
    const message = `💸 <b>انتقال موجودی</b>

لطفاً آیدی عددی کاربری که می‌خواهید موجودی به او انتقال دهید را وارد کنید.

<b>⚠️ توجه:</b> آیدی باید به صورت عدد باشد.`;

    const requestMessageId = ctx.callbackQuery?.message?.message_id || null;

    setTransferState(userId, {
      state: 'waiting_target_user_id',
      requestMessageId: requestMessageId
    });

    const keyboard = [
      [
        { text: '🔙 بازگشت', callback_data: 'my_account' }
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
        console.log('[transferWallet] Message not modified');
      } else {
        console.error('[transferWallet] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[transferWallet] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در شروع انتقال', show_alert: true });
  }
};
