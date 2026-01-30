import { clearTransferState } from '../services/transferState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  clearTransferState(userId);

  try {
    const message = `❌ <b>انتقال موجودی لغو شد</b>

انتقال موجودی لغو شد.`;

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔙 بازگشت به حساب کاربری', callback_data: 'my_account' }
            ]
          ]
        }
      });
    } catch (error) {
      console.error('[transferCancel] Error editing message:', error);
    }
  } catch (error) {
    console.error('[transferCancel] Error:', error);
  }
};

