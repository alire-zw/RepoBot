import { isAdmin } from '../services/admin.js';
import { getTrialEnabled, setTrialEnabled, setTrialServerId, setTrialInboundId, resetAllTrialClaims } from '../services/panelSettingsService.js';
import { getActiveServers } from '../services/serverService.js';
import panelSettingsHandler from './panelSettingsHandler.js';

const BUTTON_TEXT_MAX = 28;

export async function showTrialMenu(ctx) {
  const userId = ctx.from.id;
  if (!isAdmin(userId)) return;
  const trialOn = await getTrialEnabled();
  const message = `🧪 <b>اشتراک تست</b>

وضعیت: ${trialOn ? '✅ روشن' : '❌ خاموش'}
اشتراک تست: 100 مگابایت، 1 روز. هر کاربر فقط یک‌بار می‌تواند دریافت کند.`;
  const keyboard = [];
  if (trialOn) {
    keyboard.push([{ text: '🔴 خاموش کردن', callback_data: 'panel_settings_trial_off' }]);
  } else {
    keyboard.push([{ text: '🟢 روشن و انتخاب سرور', callback_data: 'panel_settings_trial_server_list' }]);
  }
  keyboard.push([{ text: '🔄 ریست دریافت تست همه کاربران', callback_data: 'panel_settings_trial_reset' }]);
  keyboard.push([{ text: '🔙 بازگشت', callback_data: 'panel_settings' }]);
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  }
}

export default async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const data = ctx.callbackQuery?.data;
  if (data === 'panel_settings_trial_off') {
    await setTrialEnabled(false);
    await setTrialServerId(null);
    await setTrialInboundId(null);
    await panelSettingsHandler(ctx);
    return;
  }
  if (data === 'panel_settings_trial_reset') {
    const message = `🔄 <b>ریست دریافت تست</b>

آیا مطمئن هستید؟ با این کار <b>همه کاربران</b> دوباره می‌توانند یک‌بار اشتراک تست دریافت کنند.`;
    const keyboard = [
      [{ text: '✅ بله، ریست کن', callback_data: 'panel_settings_trial_reset_confirm' }],
      [{ text: '🔙 انصراف', callback_data: 'panel_settings_trial' }]
    ];
    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    } catch (e) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
    return;
  }
  if (data === 'panel_settings_trial_reset_confirm') {
    const count = await resetAllTrialClaims();
    await ctx.answerCbQuery({ text: `ریست انجام شد. ${count} کاربر می‌توانند دوباره تست بگیرند.`, show_alert: false });
    await panelSettingsHandler(ctx);
    return;
  }
  if (data === 'panel_settings_trial_server_list') {
    const servers = await getActiveServers();
    const message = '🖥️ سرور اشتراک تست را انتخاب کنید:';
    const keyboard = servers.map((s) => {
      const name = (s.serverName || s.serverIP || '').length > BUTTON_TEXT_MAX
        ? (s.serverName || s.serverIP || '').substring(0, BUTTON_TEXT_MAX - 1) + '…'
        : (s.serverName || s.serverIP || 'سرور ' + s.id);
      return [{ text: '🖥️ ' + name, callback_data: `panel_settings_trial_server_${s.id}` }];
    });
    keyboard.push([{ text: '🔙 بازگشت', callback_data: 'panel_settings_trial' }]);
    try {
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (e) {
      await ctx.reply(message, { reply_markup: { inline_keyboard: keyboard } });
    }
    return;
  }
  await showTrialMenu(ctx);
}
