import { isAdmin } from '../services/admin.js';
import { getCleanInactiveEnabled, setCleanInactiveEnabled } from '../services/panelSettingsService.js';
import { runCleanInactiveJob } from '../jobs/panelJobs.js';
import panelSettingsHandler from './panelSettingsHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }
  const current = await getCleanInactiveEnabled();
  const turningOn = !current;
  await setCleanInactiveEnabled(turningOn);
  if (turningOn) {
    try {
      await runCleanInactiveJob();
    } catch (e) {
      console.error('[panelSettingsClean] run clean on enable:', e.message);
    }
  }
  await ctx.answerCbQuery({
    text: turningOn ? 'حذف خودکار غیرفعال‌ها روشن شد و یک بار اجرا شد' : 'حذف خودکار غیرفعال‌ها خاموش شد',
    show_alert: false
  });
  await panelSettingsHandler(ctx);
}
