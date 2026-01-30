import { isAdmin } from '../services/admin.js';
import { getBotSettingsState, clearBotSettingsState } from '../services/botSettingsState.js';
import { setAutoBackupChannelId } from '../services/panelSettingsService.js';
import panelSettingsHandler from './panelSettingsHandler.js';

export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) return false;

  const state = getBotSettingsState(userId);
  if (!state || state.step !== 'waiting_backup_channel_forward') return false;

  const chat = ctx.message?.forward_from_chat;
  if (!chat || chat.type !== 'channel') return false;

  const channelId = chat.id;
  await setAutoBackupChannelId(String(channelId));
  clearBotSettingsState(userId);

  try {
    await ctx.deleteMessage();
  } catch (_) {}

  await ctx.reply(`✅ کانال بکاپ ذخیره شد: ${channelId}`, {
    reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت به تنظیمات پنل', callback_data: 'panel_settings' }]] }
  });
  return true;
}
