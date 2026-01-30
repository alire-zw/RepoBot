import { isAdmin } from '../services/admin.js';
import {
  getAutoBackupEnabled,
  setAutoBackupEnabled,
  getAutoBackupChannelId,
  setAutoBackupChannelId
} from '../services/panelSettingsService.js';
import { setBotSettingsState, getBotSettingsState, clearBotSettingsState } from '../services/botSettingsState.js';
import { runAutoBackupJob } from '../jobs/panelJobs.js';
import panelSettingsHandler from './panelSettingsHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const data = ctx.callbackQuery?.data;
  const backupOn = await getAutoBackupEnabled();
  const channelId = await getAutoBackupChannelId();

  if (data === 'panel_settings_backup_toggle') {
    const turningOn = !backupOn;
    await setAutoBackupEnabled(turningOn);
    if (turningOn) {
      try {
        await runAutoBackupJob(ctx.telegram);
      } catch (e) {
        console.error('[panelSettingsBackup] run backup on enable:', e.message);
      }
    }
    await ctx.answerCbQuery({
      text: turningOn ? 'بکاپ خودکار روشن شد و یک بکاپ ارسال شد' : 'بکاپ خودکار خاموش شد',
      show_alert: false
    });
    await panelSettingsHandler(ctx);
    return;
  }

  if (data === 'panel_settings_backup_channel') {
    clearBotSettingsState(ctx.from.id);
    setBotSettingsState(ctx.from.id, {
      step: 'waiting_backup_channel_forward',
      requestMessageId: ctx.callbackQuery?.message?.message_id,
      chatId: ctx.chat?.id
    });
    const message = `📤 <b>کانال ارسال بکاپ</b>

یک پیام از کانالی که می‌خواهید فایل‌های بکاپ در آن ارسال شوند را <b>Forward</b> کنید.

ربات باید در آن کانال ادمین باشد.`;
    const keyboard = [[{ text: '🔙 انصراف', callback_data: 'panel_settings_backup' }]];
    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (e) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
    return;
  }

  const message = `📦 <b>بکاپ خودکار پنل</b>

وضعیت: ${backupOn ? '✅ روشن' : '❌ خاموش'}
${channelId ? `کانال فعلی: <code>${channelId}</code>` : 'کانال تنظیم نشده'}

با روشن بودن، هر 5 دقیقه بکاپ پنل فراخوانی می‌شود و به کانال اطلاع‌رسانی می‌شود.`;
  const keyboard = [
    [{ text: backupOn ? '🔴 خاموش کردن' : '🟢 روشن کردن', callback_data: 'panel_settings_backup_toggle' }],
    [{ text: channelId ? '📝 تغییر کانال بکاپ' : '📝 تنظیم کانال بکاپ', callback_data: 'panel_settings_backup_channel' }],
    [{ text: '🔙 بازگشت', callback_data: 'panel_settings' }]
  ];
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
}
