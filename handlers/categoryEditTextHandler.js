import { getCategoryState, clearCategoryState } from '../services/categoryState.js';
import { updateCategory, findCategoryById } from '../services/categoryService.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const state = getCategoryState(userId);
  if (!state || state.mode !== 'editing') return false;

  const text = (ctx.message?.text || '').trim();
  const { categoryId, chatId, requestMessageId } = state;

  try {
    if (ctx.message?.message_id != null && ctx.chat?.id != null) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
  } catch (e) {}

  if (!text) {
    await ctx.reply('❌ نام دسته‌بندی نمی‌تواند خالی باشد. لطفاً دوباره وارد کنید.');
    return true;
  }

  if (text.length > 255) {
    await ctx.reply('❌ نام دسته‌بندی حداکثر ۲۵۵ کاراکتر است. لطفاً کوتاه‌تر وارد کنید.');
    return true;
  }

  clearCategoryState(userId);

  try {
    await updateCategory(categoryId, text);
    const category = await findCategoryById(categoryId);
    const message = `✅ دسته‌بندی با موفقیت ویرایش شد.

<b>نام جدید:</b> ${category.name}`;
    const keyboard = [
      [{ text: '✏️ ویرایش نام', callback_data: `category_edit_${categoryId}` }],
      [{ text: '🗑️ حذف دسته‌بندی', callback_data: `category_delete_${categoryId}` }],
      [{ text: '🔙 بازگشت به لیست دسته‌بندی‌ها', callback_data: 'category_list' }]
    ];

    try {
      if (chatId && requestMessageId) {
        await ctx.telegram.editMessageText(chatId, requestMessageId, null, message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      } else {
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: keyboard }
        });
      }
    } catch (editErr) {
      if (!editErr.description?.includes('message is not modified')) {
        await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
      }
    }
    return true;
  } catch (err) {
    console.error('[categoryEditTextHandler] updateCategory error:', err);
    await ctx.reply('❌ خطا در بروزرسانی دسته‌بندی. لطفاً دوباره تلاش کنید.');
    return true;
  }
};
