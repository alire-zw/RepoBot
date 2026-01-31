import { isAdmin } from '../services/admin.js';
import { findServerByDatabaseID, updateServer, checkServerConnection, getServerStats } from '../services/serverService.js';
import { getServerEditState, clearServerEditState } from '../services/serverState.js';
import { getServerDetailKeyboard, getServerDetailMessage } from '../helpers/serverDetailHelpers.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return false;

  const state = getServerEditState(userId);
  if (!state || !state.serverId || !state.field) return false;

  const text = (ctx.message?.text || '').trim();
  const { serverId, field, chatId, requestMessageId } = state;

  try {
    if (ctx.message?.message_id != null && ctx.chat?.id != null) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
  } catch (_) {}

  const editRequestMessage = async (message, keyboard) => {
    if (chatId && requestMessageId) {
      try {
        await ctx.telegram.editMessageText(chatId, requestMessageId, null, message, {
          parse_mode: 'HTML',
          reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
        });
        return true;
      } catch (e) {
        if (!e.description?.includes('message is not modified')) {
          await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined });
        }
        return false;
      }
    }
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined });
    return false;
  };

  const cancelKeyboard = [[{ text: '🔙 بازگشت به جزئیات سرور', callback_data: `server_detail_${serverId}` }]];

  if (field === 'port') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1 || num > 65535) {
      await editRequestMessage('❌ پورت باید عددی بین ۱ تا ۶۵۵۳۵ باشد. دوباره وارد کنید:', cancelKeyboard);
      return true;
    }
  } else if (['serverDomain', 'serverPath', 'remark'].includes(field)) {
    // اختیاری
  } else {
    if (!text) {
      await editRequestMessage('❌ مقدار خالی مجاز نیست. دوباره وارد کنید:', cancelKeyboard);
      return true;
    }
  }

  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    clearServerEditState(userId);
    await editRequestMessage('❌ سرور یافت نشد.', cancelKeyboard);
    return true;
  }

  const updateData = {};
  if (field === 'port') {
    updateData.port = parseInt(text, 10);
  } else {
    updateData[field] = text || null;
  }

  try {
    await updateServer(serverId, updateData);
  } catch (err) {
    console.error('[serverEditTextHandler] updateServer error:', err);
    await editRequestMessage('❌ خطا در ذخیره. لطفاً دوباره تلاش کنید.', cancelKeyboard);
    return true;
  }

  clearServerEditState(userId);

  const updatedServer = await findServerByDatabaseID(serverId);
  const connectionResult = await checkServerConnection(updatedServer);
  const statsResult = await getServerStats(updatedServer);
  const stats = statsResult.success ? statsResult.stats : null;
  const keyboard = getServerDetailKeyboard(updatedServer, stats, connectionResult, serverId);
  const message = getServerDetailMessage(updatedServer, connectionResult);

  await editRequestMessage(message, keyboard.inline_keyboard);
  return true;
};
