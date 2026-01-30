import { isAdmin } from '../services/admin.js';
import { setCategoryState } from '../services/categoryState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    setCategoryState(userId, {
      mode: 'adding',
      chatId: ctx.chat?.id,
      requestMessageId: ctx.callbackQuery?.message?.message_id
    });

    const message = `<b>افزودن دسته‌بندی</b>

لطفاً <b>نام دسته‌بندی</b> را وارد کنید (مثال: یک ماهه، دو ماهه، ده روزه).

⚠️ فقط نام؛ عدد یا فیلد دیگری نیاز نیست.
برای لغو، روی دکمه بازگشت کلیک کنید.`;

    const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'category_management' }]];

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
    console.error('[categoryAddHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در شروع افزودن دسته‌بندی', show_alert: true });
  }
};
