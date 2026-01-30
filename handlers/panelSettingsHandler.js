import { isAdmin } from '../services/admin.js';
import {
  getTrialEnabled,
  getTrialServerId,
  getCleanInactiveEnabled,
  getAutoBackupEnabled,
  getAutoBackupChannelId
} from '../services/panelSettingsService.js';
import { findServerByDatabaseID } from '../services/serverService.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const [trialOn, cleanOn, backupOn] = await Promise.all([
    getTrialEnabled(),
    getCleanInactiveEnabled(),
    getAutoBackupEnabled()
  ]);
  const trialServerId = await getTrialServerId();
  const backupChannelId = await getAutoBackupChannelId();

  let trialServerName = '—';
  if (trialServerId) {
    const s = await findServerByDatabaseID(trialServerId);
    if (s) trialServerName = s.serverName || s.serverIP || String(trialServerId);
  }

  const message = `🖥️ <b>تنظیمات پنل و کانفیگ‌ها</b>

🧪 <b>اشتراک تست:</b> ${trialOn ? '✅ روشن' : '❌ خاموش'}
${trialOn ? `سرور: ${trialServerName}` : ''}

🧹 <b>حذف کلاینت‌های غیرفعال:</b> ${cleanOn ? '✅ روشن' : '❌ خاموش'}
(کلاینت‌های منقضی‌شده بیش از 5 روز به‌صورت خودکار حذف می‌شوند)

📦 <b>بکاپ خودکار پنل:</b> ${backupOn ? '✅ روشن' : '❌ خاموش'}
${backupOn && backupChannelId ? `کانال: ${backupChannelId}` : ''}`;

  const keyboard = [
    [
      { text: trialOn ? '🧪 ✅ اشتراک تست (روشن)' : '🧪 اشتراک تست', callback_data: 'panel_settings_trial' }
    ],
    [
      { text: cleanOn ? '🧹 ✅ حذف غیرفعال‌ها (روشن)' : '🧹 حذف غیرفعال‌ها', callback_data: 'panel_settings_clean' }
    ],
    [
      { text: backupOn ? '📦 ✅ بکاپ خودکار (روشن)' : '📦 بکاپ خودکار', callback_data: 'panel_settings_backup' }
    ],
    [{ text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }]
  ];

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
}
