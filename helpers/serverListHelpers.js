/**
 * ساخت پیام صفحه مدیریت سرورها (مشابه بخش‌های دیگر ادمین)
 */
/** تاریخ با اعداد لاتین (۰–۹ → 0–9) */
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

export function getServersManagementMessage() {
  const now = formatDateLatin();
  return `🖥️ <b>مدیریت سرورها</b>

شما می‌توانید سرورهای ربات را از این بخش مدیریت کنید. برای مشاهده اطلاعات بیشتر درباره هر قسمت، روی دکمه‌های مربوطه کلیک کنید.

🕰 آخرین بروزرسانی: ${now}
.`;
}

/**
 * ساخت پیام لیست سرورها
 */
export function getServersListMessage(currentPage, totalPages, totalServers) {
  const now = formatDateLatin();

  if (totalServers === 0) {
    return `📋 <b>لیست سرورها</b>

⚠️ هیچ سروری در سیستم ثبت نشده است.

🕰 آخرین بروزرسانی: ${now}
.`;
  }

  return `📋 <b>لیست سرورها</b>

شما می‌توانید لیست تمام سرورهای ثبت شده در سیستم را از این بخش مشاهده کنید.

🕰 آخرین بروزرسانی: ${now}
.`;
}

const PER_PAGE = 5;

/**
 * ساخت کیبورد لیست سرورها با هدر و pagination.
 * connectionResults: آرایهٔ نتیجهٔ checkServerConnection برای هر سرور در slice (همان ترتیب).
 */
export function buildServersListKeyboard(servers, page = 1, perPage = PER_PAGE, connectionResults = null) {
  const totalServers = servers.length;
  const totalPages = Math.ceil(totalServers / perPage) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * perPage;
  const slice = servers.slice(start, start + perPage);

  const keyboard = [];

  if (totalServers > 0) {
    keyboard.push([
      { text: '📡 وضعیت اتصال', callback_data: 'servers_list_header' },
      { text: '🔌 پورت', callback_data: 'servers_list_header' },
      { text: '🖥️ سرور', callback_data: 'servers_list_header' }
    ]);

    for (let i = 0; i < slice.length; i++) {
      const server = slice[i];
      const serverName = server.serverName.length > 15
        ? server.serverName.substring(0, 15) + '...'
        : server.serverName;
      const conn = connectionResults && connectionResults[i];
      const connectionStatus =
        conn === undefined ? '⏳' : conn.success ? '🟢 متصل' : '🔴 قطع';
      const cb = `server_detail_${server.id}`;
      keyboard.push([
        { text: connectionStatus, callback_data: cb },
        { text: `${server.port}`, callback_data: cb },
        { text: serverName, callback_data: cb }
      ]);
    }

    if (totalPages > 1) {
      const row = [];
      if (validPage > 1) row.push({ text: '◀️ قبلی', callback_data: `server_list_page_${validPage - 1}` });
      if (validPage < totalPages) row.push({ text: 'بعدی ▶️', callback_data: `server_list_page_${validPage + 1}` });
      if (row.length) keyboard.push(row);
    }
  }

  keyboard.push([{ text: '➕ افزودن سرور', callback_data: 'server_add' }]);
  keyboard.push([{ text: '🔙 بازگشت به منوی مدیریت سرورها', callback_data: 'server_management' }]);

  return {
    inline_keyboard: keyboard,
    currentPage: validPage,
    totalPages,
    totalServers
  };
}
