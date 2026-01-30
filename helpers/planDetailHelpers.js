/**
 * ساخت کیبورد و پیام جزئیات پلن (مشابه صفحه جزئیات سرور)
 */

function truncate(str, len) {
  if (!str) return 'ندارد';
  return str.length > len ? str.substring(0, len) + '...' : str;
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

export function getPlanDetailKeyboard(plan, planId) {
  const capText = plan.capacityLimited ? `${plan.capacity} نفر` : 'نامحدود';
  const priceFormatted = Number(plan.priceToman || 0).toLocaleString('fa-IR', { numberingSystem: 'latn' });

  const rows = [
    [{ text: 'اطلاعات پلن', callback_data: 'plan_info_header' }],
    [
      { text: '📋 نام پلن', callback_data: 'plan_info_name' },
      { text: truncate(plan.name, 12), callback_data: 'plan_info_name' }
    ],
    [{ text: '✏️ ویرایش نام', callback_data: `plan_edit_name_${planId}` }],
    [
      { text: '💾 حجم (GB)', callback_data: 'plan_info_volume' },
      { text: `${plan.volumeGB}`, callback_data: 'plan_info_volume' }
    ],
    [{ text: '✏️ ویرایش حجم', callback_data: `plan_edit_volume_${planId}` }],
    [
      { text: '📅 مدت (روز)', callback_data: 'plan_info_duration' },
      { text: `${plan.durationDays}`, callback_data: 'plan_info_duration' }
    ],
    [{ text: '✏️ ویرایش مدت', callback_data: `plan_edit_duration_${planId}` }],
    [
      { text: 'دسته‌بندی', callback_data: 'plan_info_category' },
      { text: truncate(plan.categoryName || '—', 12), callback_data: 'plan_info_category' }
    ],
    [{ text: '✏️ ویرایش دسته‌بندی', callback_data: `plan_edit_category_${planId}` }],
    [
      { text: '🖥️ سرور', callback_data: 'plan_info_server' },
      { text: truncate(plan.serverName || `سرور ${plan.serverId}`, 12), callback_data: 'plan_info_server' }
    ],
    [{ text: '✏️ ویرایش سرور و اینباند', callback_data: `plan_edit_server_${planId}` }],
    [
      { text: '📡 اینباند', callback_data: 'plan_info_inbound' },
      { text: truncate(plan.inboundTag || plan.inboundId || '—', 12), callback_data: 'plan_info_inbound' }
    ],
    [
      { text: '👥 ظرفیت', callback_data: 'plan_info_capacity' },
      { text: capText, callback_data: 'plan_info_capacity' }
    ],
    [{ text: '✏️ ویرایش ظرفیت', callback_data: `plan_edit_capacity_${planId}` }],
    [
      { text: '💰 قیمت (تومان)', callback_data: 'plan_info_price' },
      { text: priceFormatted, callback_data: 'plan_info_price' }
    ],
    [{ text: '✏️ ویرایش قیمت', callback_data: `plan_edit_price_${planId}` }],
    [
      { text: '🗑️ حذف پلن', callback_data: `plan_delete_${planId}` }
    ],
    [{ text: '🔙 بازگشت به لیست پلن‌ها', callback_data: 'plan_list' }]
  ];

  return { inline_keyboard: rows };
}

export function getPlanDetailMessage(plan) {
  const now = formatDateLatin();
  const capText = plan.capacityLimited ? `${plan.capacity} نفر` : 'نامحدود';
  const priceFormatted = Number(plan.priceToman || 0).toLocaleString('fa-IR', { numberingSystem: 'latn' });

  return `<b>جزئیات پلن</b>

می‌توانید اطلاعات پلن را اینجا ببینید و ویرایش کنید.

<b>نام:</b> ${plan.name}
<b>حجم:</b> ${plan.volumeGB} گیگابایت
<b>مدت:</b> ${plan.durationDays} روز
<b>دسته‌بندی:</b> ${plan.categoryName || '—'}
<b>سرور:</b> ${plan.serverName || `ID: ${plan.serverId}`}
<b>اینباند:</b> ${plan.inboundTag || plan.inboundId || '—'}
<b>ظرفیت:</b> ${capText}
<b>قیمت:</b> ${priceFormatted} تومان

🕰 آخرین بروزرسانی: ${now}`;
}
