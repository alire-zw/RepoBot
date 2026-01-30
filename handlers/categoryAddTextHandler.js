import { getCategoryState, clearCategoryState } from '../services/categoryState.js';
import { createCategory, getAllCategories } from '../services/categoryService.js';
import {
  getCategoriesListMessage,
  buildCategoriesListKeyboard
} from '../helpers/categoryListHelpers.js';

async function updateMessage(ctx, chatId, messageId, text, keyboard) {
  try {
    if (chatId && messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, null, text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
      return true;
    }
  } catch (e) {
    if (e.description && e.description.includes('message is not modified')) return true;
  }
  return false;
}

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const state = getCategoryState(userId);
  if (!state || state.mode !== 'adding') return false;

  const text = (ctx.message?.text || '').trim();
  const chatId = state.chatId || ctx.chat?.id;
  const requestMessageId = state.requestMessageId;
  const keyboard = [[{ text: '🔙 بازگشت به دسته‌بندی و پلن‌ها', callback_data: 'category_management' }]];

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
    await createCategory(text);
    const categories = await getAllCategories();
    const { inline_keyboard, currentPage, totalPages, totalCategories } = buildCategoriesListKeyboard(
      categories,
      1
    );
    const successMsg = `✅ دسته‌بندی <b>${text}</b> با موفقیت اضافه شد.`;
    const message = getCategoriesListMessage(currentPage, totalPages, totalCategories);
    const ok = await updateMessage(ctx, chatId, requestMessageId, `${successMsg}\n\n${message}`, inline_keyboard);
    if (!ok) await ctx.reply(successMsg, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('[categoryAddTextHandler] createCategory error:', err);
    await ctx.reply('❌ خطا در ذخیره دسته‌بندی. لطفاً دوباره تلاش کنید.');
  }
  return true;
}
