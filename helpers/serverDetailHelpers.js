import { formatBytes } from '../services/serverService.js';

function truncate(str, len) {
  if (!str) return 'ندارد';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function statusText(server) {
  const isActive = server.isActive === 1 || server.isActive === true || server.isActive === '1';
  return isActive ? '✅ فعال' : '❌ غیرفعال';
}

/**
 * ساخت کیبورد جزئیات سرور (مشابه فایل ادمین)
 * دکمه‌های شیشه‌ای مقادیر برای ویرایش: server_edit_فیلد_serverId
 */
export function getServerDetailKeyboard(server, stats, connectionResult, serverId) {
  const connText = connectionResult && connectionResult.success ? '✅ متصل' : '❌ قطع';
  const isActive = server.isActive === 1 || server.isActive === true || server.isActive === '1';
  const toggleLabel = isActive ? 'غیرفعال کردن' : 'فعال کردن';
  const sid = String(serverId);

  const rows = [
    [{ text: '🖥️ اطلاعات کلی سرور', callback_data: 'server_general_info' }],
    [
      { text: '📋 نام سرور', callback_data: `server_edit_serverName_${sid}` },
      { text: '🌐 IP سرور', callback_data: `server_edit_serverIP_${sid}` }
    ],
    [
      { text: truncate(server.serverName, 15), callback_data: `server_edit_serverName_${sid}` },
      { text: truncate(server.serverIP, 15), callback_data: `server_edit_serverIP_${sid}` }
    ],
    [
      { text: '🔗 دامنه', callback_data: `server_edit_serverDomain_${sid}` },
      { text: '🔌 پورت', callback_data: `server_edit_port_${sid}` }
    ],
    [
      { text: truncate(server.serverDomain, 15), callback_data: `server_edit_serverDomain_${sid}` },
      { text: `${server.port}`, callback_data: `server_edit_port_${sid}` }
    ],
    [{ text: '⚙️ تنظیمات', callback_data: 'server_settings_info' }],
    [
      { text: '📁 Path', callback_data: `server_edit_serverPath_${sid}` },
      { text: '📝 Remark', callback_data: `server_edit_remark_${sid}` }
    ],
    [
      { text: truncate(server.serverPath, 15), callback_data: `server_edit_serverPath_${sid}` },
      { text: truncate(server.remark, 20), callback_data: `server_edit_remark_${sid}` }
    ],
    [{ text: '📊 آمار و وضعیت', callback_data: 'server_stats_info' }],
    [
      { text: '📡 اینباندها', callback_data: 'server_inbounds' },
      { text: '👥 کلاینت‌ها', callback_data: 'server_clients' }
    ],
    [
      { text: stats ? `${stats.totalInbounds}` : '—', callback_data: 'server_inbounds_value' },
      { text: stats ? `${stats.totalClients}` : '—', callback_data: 'server_clients_value' }
    ],
    [
      { text: '🟢 آنلاین', callback_data: 'server_online' },
      { text: '📊 وضعیت اتصال', callback_data: 'server_status' }
    ],
    [
      { text: stats ? `${stats.onlineClients}` : '—', callback_data: 'server_online_value' },
      { text: connText, callback_data: 'server_status_value' }
    ],
    [{ text: '⚙️ تنظیمات وضعیت', callback_data: 'server_status_settings' }],
    [
      { text: '🔄 فعال/غیرفعال', callback_data: 'server_toggle_active' },
      { text: statusText(server), callback_data: 'server_status_display' }
    ],
    [{ text: toggleLabel, callback_data: `server_toggle_${serverId}` }],
    [{ text: '📈 آمار ترافیک', callback_data: 'server_traffic_info' }],
    [
      { text: '⬆️ آپلود', callback_data: 'server_upload' },
      { text: '⬇️ دانلود', callback_data: 'server_download' }
    ],
    [
      { text: stats ? formatBytes(stats.totalUpload) : '—', callback_data: 'server_upload_value' },
      { text: stats ? formatBytes(stats.totalDownload) : '—', callback_data: 'server_download_value' }
    ],
    [{ text: '📊 کل ترافیک', callback_data: 'server_total_traffic' }],
    [{ text: stats ? formatBytes(stats.totalTraffic) : '—', callback_data: 'server_total_traffic_value' }],
    [
      { text: '🗑️ حذف سرور', callback_data: `server_delete_${serverId}` },
      { text: '🔄 بروزرسانی آمار', callback_data: `server_refresh_${serverId}` }
    ],
    [{ text: '🔙 بازگشت به لیست سرورها', callback_data: 'server_list' }]
  ];

  return { inline_keyboard: rows };
}

/** تاریخ با اعداد لاتین */
function formatDateLatin() {
  return new Date().toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    numberingSystem: 'latn'
  });
}

/**
 * ساخت پیام جزئیات سرور
 */
export function getServerDetailMessage(server, connectionResult) {
  const now = formatDateLatin();
  const connText = connectionResult && connectionResult.success ? '✅ متصل' : (connectionResult && connectionResult.error ? `❌ ${connectionResult.error}` : '❌ قطع');

  return `🖥️ <b>جزئیات سرور</b>

می‌توانید اطلاعات و آمار سرور را اینجا ببینید. برای بروزرسانی آمار روی «بروزرسانی آمار» کلیک کنید.

📡 <b>وضعیت اتصال:</b> ${connText}
🕰 آخرین بروزرسانی: ${now}
.`;
}
