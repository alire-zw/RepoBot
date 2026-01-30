import { getPlanAddState, setPlanAddState, clearPlanAddState } from '../services/planState.js';
import { getAllCategories } from '../services/categoryService.js';
import {
  buildCategorySelectKeyboard,
  buildPlanConfirmKeyboard,
  getPlanConfirmMessage
} from '../helpers/planAddHelpers.js';

async function updatePlanAddMessage(ctx, chatId, messageId, text, keyboard) {
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

  const state = getPlanAddState(userId);
  if (!state || !state.step) return false;

  const text = (ctx.message?.text || '').trim();
  const step = state.step;
  const data = state.data || {};
  const chatId = state.chatId || ctx.chat?.id;
  const requestMessageId = state.requestMessageId;
  const keyboardCancel = [[{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]];

  try {
    if (ctx.message?.message_id != null && ctx.chat?.id != null) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
  } catch (e) {}

  if (step === 'planName') {
    if (!text) {
      await ctx.reply('❌ نام پلن نمی‌تواند خالی باشد.');
      return true;
    }
    data.planName = text;
    setPlanAddState(userId, { ...state, step: 'volumeGB', data });
    const msg = `<b>حجم پلن (گیگابایت)</b>\n\nعدد وارد کنید (مثال: 10):`;
    await updatePlanAddMessage(ctx, chatId, requestMessageId, msg, keyboardCancel);
    if (!(chatId && requestMessageId)) await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboardCancel } });
    return true;
  }

  if (step === 'volumeGB') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply('❌ لطفاً یک عدد مثبت وارد کنید.');
      return true;
    }
    data.volumeGB = num;
    setPlanAddState(userId, { ...state, step: 'durationDays', data });
    const msg = `<b>مدت پلن (روز)</b>\n\nتعداد روز را وارد کنید (مثال: 30):`;
    await updatePlanAddMessage(ctx, chatId, requestMessageId, msg, keyboardCancel);
    if (!(chatId && requestMessageId)) await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboardCancel } });
    return true;
  }

  if (step === 'durationDays') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) {
      await ctx.reply('❌ لطفاً یک عدد مثبت وارد کنید.');
      return true;
    }
    data.durationDays = num;
    const categories = await getAllCategories();
    if (categories.length === 0) {
      await ctx.reply('❌ ابتدا حداقل یک دسته‌بندی اضافه کنید.');
      return true;
    }
    setPlanAddState(userId, { ...state, step: 'category', data });
    const keyboard = buildCategorySelectKeyboard(categories);
    const msg = `<b>دسته‌بندی</b>\n\nاین پلن در کدام دسته‌بندی قرار بگیرد؟`;
    await updatePlanAddMessage(ctx, chatId, requestMessageId, msg, keyboard);
    if (!(chatId && requestMessageId)) await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    return true;
  }

  if (step === 'capacity') {
    const isUnlimited = text === '-' || text.toLowerCase() === 'نامحدود';
    if (isUnlimited) {
      data.capacityLimited = false;
      data.capacity = null;
    } else {
      const num = parseInt(text, 10);
      if (isNaN(num) || num < 1) {
        await ctx.reply('❌ برای محدود عدد مثبت و برای نامحدود «-» بفرستید.');
        return true;
      }
      data.capacityLimited = true;
      data.capacity = num;
    }
    setPlanAddState(userId, { ...state, step: 'price', data });
    const msg = `💰 <b>قیمت (تومان)</b>\n\nقیمت پلن را به تومان وارد کنید:`;
    await updatePlanAddMessage(ctx, chatId, requestMessageId, msg, keyboardCancel);
    if (!(chatId && requestMessageId)) await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboardCancel } });
    return true;
  }

  if (step === 'price') {
    const num = parseInt(String(text).replace(/,/g, ''), 10);
    if (isNaN(num) || num < 0) {
      await ctx.reply('❌ لطفاً یک عدد معتبر (قیمت به تومان) وارد کنید.');
      return true;
    }
    data.priceToman = num;
    setPlanAddState(userId, { ...state, step: 'confirm', data });
    const { findCategoryById } = await import('../services/categoryService.js');
    const { findServerByDatabaseID } = await import('../services/serverService.js');
    const categoryName = data.categoryId ? (await findCategoryById(data.categoryId))?.name : null;
    const serverName = data.serverId ? (await findServerByDatabaseID(data.serverId))?.serverName : null;
    const inboundTag = data.inboundTag || null;
    const msg = getPlanConfirmMessage(data, categoryName, serverName, inboundTag);
    const keyboard = buildPlanConfirmKeyboard();
    await updatePlanAddMessage(ctx, chatId, requestMessageId, msg, keyboard);
    if (!(chatId && requestMessageId)) await ctx.reply(msg, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    return true;
  }

  return false;
}
