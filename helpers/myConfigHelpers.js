/**
 * پیام‌ها و کیبوردهای بخش «کانفیگ های من»
 */

import { formatBytes } from '../services/serverService.js';

const PER_PAGE = 5;

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

/** پیام لیست اشتراک‌ها */
export function getMyConfigsListMessage(currentPage, totalPages, totalConfigs) {
  const now = formatDateLatin();
  if (totalConfigs === 0) {
    return `📟 <b>کانفیگ های من</b>

هنوز اشتراکی خریداری نکرده‌اید. از بخش «خرید اشتراک جدید» می‌توانید اشتراک تهیه کنید.

🕰 آخرین بروزرسانی: ${now}`;
  }
  return `📟 <b>کانفیگ های من</b>

لیست اشتراک‌های شما با اطلاعات زنده از پنل. روی هر مورد کلیک کنید برای جزئیات و مدیریت.

🕰 آخرین بروزرسانی: ${now}`;
}

/**
 * ساخت کیبورد لیست اشتراک‌ها
 * items: آرایهٔ { sub, live } که sub از DB و live نتیجه getClientTrafficsByEmail است
 */
export function buildMyConfigsListKeyboard(items, page, totalConfigs) {
  const totalPages = Math.ceil(totalConfigs / PER_PAGE) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * PER_PAGE;
  const slice = items.slice(start, start + PER_PAGE);

  const keyboard = [];

  if (slice.length > 0) {
    keyboard.push([
      { text: '📊 وضعیت', callback_data: 'myconfig_list_header' },
      { text: '📦 حجم', callback_data: 'myconfig_list_header' },
      { text: '📌 نام', callback_data: 'myconfig_list_header' }
    ]);

    for (const { sub, live } of slice) {
      const isTrial = sub.clientEmail && String(sub.clientEmail).startsWith('test ') && / - \d+$/.test(String(sub.clientEmail));
      const name = (isTrial ? (sub.planName || 'test') : (sub.clientEmail || sub.planName || 'اشتراک')).substring(0, 14);
      let volText = '—';
      let statusText = '⏳';
      if (isTrial) {
        volText = '0.1 GB';
      }
      if (live && live.success && live.obj) {
        const o = live.obj;
        const totalBytes = Number(o.total) || 0;
        const used = (Number(o.up) || 0) + (Number(o.down) || 0);
        const remainingBytes = totalBytes > 0 ? Math.max(0, totalBytes - used) : 0;
        if (!isTrial) volText = totalBytes > 0 ? formatBytes(remainingBytes) : '∞';
        const expiryTime = Number(o.expiryTime) || 0;
        const expired = expiryTime > 0 && Date.now() > expiryTime;
        const exhausted = totalBytes > 0 && used >= totalBytes;
        statusText = expired || exhausted ? '🔴' : '🟢';
      }
      keyboard.push([
        { text: statusText, callback_data: `myconfig_detail_${sub.id}` },
        { text: volText, callback_data: `myconfig_detail_${sub.id}` },
        { text: name, callback_data: `myconfig_detail_${sub.id}` }
      ]);
    }

    if (totalPages > 1) {
      const row = [];
      if (validPage > 1) row.push({ text: '◀️ قبلی', callback_data: `myconfig_list_page_${validPage - 1}` });
      if (validPage < totalPages) row.push({ text: 'بعدی ▶️', callback_data: `myconfig_list_page_${validPage + 1}` });
      if (row.length) keyboard.push(row);
    }
  }

  keyboard.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);

  return {
    inline_keyboard: keyboard,
    currentPage: validPage,
    totalPages,
    totalConfigs
  };
}

/** محاسبهٔ متن حجم و روز و وضعیت از live (و اختیاری sub برای تشخیص تست) */
function getDetailValues(live, sub = null) {
  const isTrial = sub && sub.clientEmail && String(sub.clientEmail).startsWith('test ') && / - \d+$/.test(String(sub.clientEmail));
  let remainingVol = '—';
  let remainingDays = '—';
  let statusText = '⏳ در حال دریافت از پنل...';
  if (isTrial) {
    remainingVol = '0.1 GB';
  }
  if (live && live.success && live.obj) {
    const o = live.obj;
    const totalBytes = Number(o.total) || 0;
    const used = (Number(o.up) || 0) + (Number(o.down) || 0);
    const remainingBytes = totalBytes > 0 ? Math.max(0, totalBytes - used) : totalBytes;
    if (!isTrial) {
      remainingVol = totalBytes > 0 ? formatBytes(remainingBytes) : 'نامحدود';
    }
    const expiryTime = Number(o.expiryTime) || 0;
    if (expiryTime > 0) {
      const nowMs = Date.now();
      const remainingMs = Math.max(0, expiryTime - nowMs);
      remainingDays = String(Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
      const expired = nowMs > expiryTime;
      const exhausted = totalBytes > 0 && used >= totalBytes;
      statusText = expired ? '🔴 منقضی شده' : exhausted ? '🔴 حجم تمام' : '🟢 فعال';
    } else {
      remainingDays = '∞';
      statusText = totalBytes > 0 && used >= totalBytes ? '🔴 حجم تمام' : '🟢 فعال';
    }
  }
  return { remainingVol, remainingDays, statusText };
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** پیام جزئیات یک اشتراک */
export function getMyConfigDetailMessage(sub, live) {
  const now = formatDateLatin();
  const isTrial = sub.clientEmail && String(sub.clientEmail).startsWith('test ') && / - \d+$/.test(String(sub.clientEmail));
  const name = isTrial ? (sub.planName || sub.clientEmail || 'test') : (sub.clientEmail || sub.planName || 'اشتراک');
  const { statusText } = getDetailValues(live, sub);

  let text = `📟 <b>جزئیات اشتراک</b>

📌 <b>نام:</b> ${name}
📊 <b>وضعیت:</b> ${statusText}

🕰 آخرین بروزرسانی: ${now}`;
  if (sub.connectionLink) {
    text += `\n\n🔗 <b>لینک اتصال:</b>\n<pre><code>${escapeHtml(sub.connectionLink)}</code></pre>`;
  }
  return text;
}

/** کیبورد جزئیات اشتراک — با دکمه‌های شیشه‌ای حجم و روز باقی‌مانده. برای اشتراک تست دکمه تمدید نمایش داده نمی‌شود. */
export function buildMyConfigDetailKeyboard(subId, sub, live) {
  const { remainingVol, remainingDays } = getDetailValues(live, sub);
  const daysDisplay = remainingDays === '∞' ? '∞' : remainingDays;
  const isTrial = sub.clientEmail && String(sub.clientEmail).startsWith('test ') && / - \d+$/.test(String(sub.clientEmail));

  const rows = [
    [
      { text: '🔄 قطع دسترسی دیگران و دریافت مجدد لینک', callback_data: `myconfig_regen_${subId}` }
    ],
    [
      { text: '📦 حجم باقی‌مانده', callback_data: `myconfig_detail_vol_${subId}` },
      { text: remainingVol, callback_data: `myconfig_detail_vol_${subId}` }
    ],
    [
      { text: '📅 روز باقی‌مانده', callback_data: `myconfig_detail_days_${subId}` },
      { text: daysDisplay, callback_data: `myconfig_detail_days_${subId}` }
    ],
    isTrial
      ? [{ text: '📱 دریافت QR کد', callback_data: `myconfig_qr_${subId}` }]
      : [
          { text: '📱 دریافت QR کد', callback_data: `myconfig_qr_${subId}` },
          { text: '🔄 تمدید اشتراک', callback_data: `myconfig_renew_${subId}` }
        ],
    [{ text: '🔙 بازگشت به لیست کانفیگ‌ها', callback_data: 'myconfig_back_to_list' }]
  ];

  return { inline_keyboard: rows };
}

export { PER_PAGE };
