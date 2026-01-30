import { isAdmin } from '../services/admin.js';
import { setPlanAddState } from '../services/planState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    setPlanAddState(userId, {
      step: 'planName',
      data: {},
      chatId: ctx.chat?.id,
      requestMessageId: ctx.callbackQuery?.message?.message_id
    });

    const message = `<b>افزودن پلن جدید</b>

لطفاً <b>نام پلن</b> را وارد کنید (مثال: 10 گیگابایت).

⚠️ برای لغو، روی دکمه بازگشت کلیک کنید.`;

    const keyboard = [[{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) return;
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    console.error('[planAddHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در شروع افزودن پلن', show_alert: true });
  }
};
