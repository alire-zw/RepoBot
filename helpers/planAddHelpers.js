/**
 * کیبوردها و پیام‌های مراحل افزودن پلن
 */

/**
 * دسته‌بندی‌ها به صورت دکمه شیشه‌ای، هر ردیف دو تا
 */
export function buildCategorySelectKeyboard(categories) {
  const keyboard = [];
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push({
      text: (categories[i].name || '').substring(0, 15),
      callback_data: `plan_category_${categories[i].id}`
    });
    if (categories[i + 1]) {
      row.push({
        text: (categories[i + 1].name || '').substring(0, 15),
        callback_data: `plan_category_${categories[i + 1].id}`
      });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]);
  return keyboard;
}

/**
 * لیست سرورها برای انتخاب (هر ردیف یک سرور)
 */
export function buildServerSelectKeyboard(servers) {
  const keyboard = [];
  for (const s of servers) {
    const name = (s.serverName || '').length > 20 ? (s.serverName || '').substring(0, 20) + '...' : (s.serverName || '');
    keyboard.push([
      { text: `🖥️ ${name} (پورت ${s.port})`, callback_data: `plan_server_${s.id}` }
    ]);
  }
  keyboard.push([{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]);
  return keyboard;
}

/**
 * اینباندها به صورت دکمه شیشه‌ای، هر ردیف دو تا. callback_data: plan_inbound_${serverId}_${index}
 */
export function buildInboundSelectKeyboard(serverId, inbounds) {
  const keyboard = [];
  for (let i = 0; i < inbounds.length; i += 2) {
    const row = [];
    const tag0 = (inbounds[i].tag || inbounds[i].id || `#${i}`).substring(0, 18);
    row.push({
      text: `📡 ${tag0}`,
      callback_data: `plan_inbound_${serverId}_${i}`
    });
    if (inbounds[i + 1]) {
      const tag1 = (inbounds[i + 1].tag || inbounds[i + 1].id || `#${i + 1}`).substring(0, 18);
      row.push({
        text: `📡 ${tag1}`,
        callback_data: `plan_inbound_${serverId}_${i + 1}`
      });
    }
    keyboard.push(row);
  }
  keyboard.push([{ text: '🔙 انصراف', callback_data: 'plan_add_cancel' }]);
  return keyboard;
}

/**
 * خلاصه پلن و دکمه‌های تایید / انصراف
 */
export function buildPlanConfirmKeyboard() {
  return [
    [
      { text: '✅ تایید و ذخیره', callback_data: 'plan_confirm_save' },
      { text: '❌ انصراف', callback_data: 'plan_confirm_cancel' }
    ]
  ];
}

export function getPlanConfirmMessage(data, categoryName, serverName, inboundTag) {
  const capText = data.capacityLimited
    ? `محدود: ${data.capacity} نفر`
    : 'نامحدود';
  return `📋 <b>خلاصه پلن</b>

<b>نام:</b> ${data.planName}
<b>حجم:</b> ${data.volumeGB} گیگابایت
<b>مدت:</b> ${data.durationDays} روز
<b>دسته‌بندی:</b> ${categoryName || '—'}
<b>سرور:</b> ${serverName || '—'}
<b>اینباند:</b> ${inboundTag || '—'}
<b>ظرفیت:</b> ${capText}
<b>قیمت (تومان):</b> ${Number(data.priceToman).toLocaleString('fa-IR', { numberingSystem: 'latn' })}

آیا ذخیره شود؟`;
}
