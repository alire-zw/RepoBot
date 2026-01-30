import { getCleanInactiveEnabled, getAutoBackupEnabled, getAutoBackupChannelId } from '../services/panelSettingsService.js';
import { getAllServers, runCleanInactiveClients, getPanelDbFile } from '../services/serverService.js';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * حذف کلاینت‌های غیرفعال (انقضا بیش از ۵ روز) در همهٔ سرورها
 */
export async function runCleanInactiveJob() {
  const enabled = await getCleanInactiveEnabled();
  if (!enabled) return;
  const servers = await getAllServers();
  for (const server of servers || []) {
    if (!server.isActive) continue;
    try {
      const result = await runCleanInactiveClients(server);
      if (result.deleted > 0 || result.errors.length > 0) {
        console.log(`[panelJobs] Clean inactive ${server.serverName}: deleted=${result.deleted}, errors=${result.errors.length}`);
      }
    } catch (e) {
      console.error(`[panelJobs] Clean inactive error ${server.serverName}:`, e.message);
    }
  }
}

/**
 * دریافت فایل .db از هر پنل و ارسال به کانال
 */
export async function runAutoBackupJob(telegram) {
  const enabled = await getAutoBackupEnabled();
  if (!enabled) return;
  const channelId = await getAutoBackupChannelId();
  if (!channelId || !telegram) return;
  const servers = await getAllServers();
  const dateStr = new Date().toISOString().slice(0, 10);
  for (const server of servers || []) {
    if (!server.isActive) continue;
    try {
      const result = await getPanelDbFile(server);
      if (!result.success) {
        try {
          await telegram.sendMessage(
            channelId,
            `❌ خطا در دریافت بکاپ پنل <b>${server.serverName || server.serverIP}</b>: ${result.error || 'نامشخص'}`,
            { parse_mode: 'HTML' }
          );
        } catch (e) {
          console.error('[panelJobs] Failed to send backup error to channel:', e.message);
        }
        continue;
      }
      const safeName = (server.serverName || server.serverIP || 'panel').replace(/[^\w\-.]/g, '_');
      const filename = `backup_${safeName}_${dateStr}.db`;
      try {
        await telegram.sendDocument(channelId, { source: result.buffer, filename });
      } catch (e) {
        console.error('[panelJobs] Failed to send backup file to channel:', e.message);
        try {
          await telegram.sendMessage(
            channelId,
            `❌ خطا در ارسال فایل بکاپ <b>${server.serverName || server.serverIP}</b>: ${e.message || 'نامشخص'}`,
            { parse_mode: 'HTML' }
          );
        } catch (_) {}
      }
    } catch (e) {
      console.error(`[panelJobs] Backup error ${server.serverName}:`, e.message);
    }
  }
}

/**
 * اجرای jobها و زمان‌بندی: حذف غيرفعال هر 24 ساعت، بکاپ هر 5 دقيقه
 */
export function schedulePanelJobs(bot) {
  const telegram = bot?.telegram;
  const runClean = () => runCleanInactiveJob().catch((e) => console.error('[panelJobs] Clean error:', e.message));
  const runBackup = () => runAutoBackupJob(telegram).catch((e) => console.error('[panelJobs] Backup error:', e.message));
  setInterval(runClean, TWENTY_FOUR_HOURS_MS);
  setInterval(runBackup, FIVE_MINUTES_MS);
  console.log('[panelJobs] Clean inactive every 24h, backup every 5 min');
}
