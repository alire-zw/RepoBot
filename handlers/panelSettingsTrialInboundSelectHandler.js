import { isAdmin } from '../services/admin.js';
import {
  setTrialEnabled,
  setTrialServerId,
  setTrialInboundId
} from '../services/panelSettingsService.js';
import panelSettingsHandler from './panelSettingsHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const data = ctx.callbackQuery?.data;
  const match = data?.match(/^panel_settings_trial_inbound_(\d+)_(.+)$/);
  if (!match) return;
  const serverId = parseInt(match[1], 10);
  const inboundId = match[2];
  await setTrialServerId(serverId);
  await setTrialInboundId(inboundId);
  await setTrialEnabled(true);
  await ctx.answerCbQuery({ text: 'اشتراک تست با موفقیت فعال شد', show_alert: false });
  await panelSettingsHandler(ctx);
}
