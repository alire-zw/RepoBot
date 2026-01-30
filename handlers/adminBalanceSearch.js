import { isAdmin } from '../services/admin.js';
import { setBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const message = `🔍 <b>جستجوی کاربر</b>

لطفاً آیدی عددی کاربر را ارسال کنید تا موجودی وی نمایش داده شود.

<b>⚠️ توجه:</b> آیدی باید به صورت عدد باشد.`;

    setBalanceState(userId, {
      state: 'searching',
      step: 'user_id',
      requestMessageId: ctx.callbackQuery?.message?.message_id || null
    });

    const keyboard = [
      [
        { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
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
        console.log('[adminBalanceSearch] Message not modified');
      } else {
        console.error('[adminBalanceSearch] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[adminBalanceSearch] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش جستجو', show_alert: true });
  }
};

