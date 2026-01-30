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

export function getPlansListMessage(currentPage, totalPages, totalPlans) {
  const now = formatDateLatin();
  if (totalPlans === 0) {
    return `📋 <b>لیست پلن‌ها</b>

⚠️ هیچ پلنی ثبت نشده است.

🕰 آخرین بروزرسانی: ${now}`;
  }
  return `📋 <b>لیست پلن‌ها</b>

صفحه ${currentPage} از ${totalPages} (تعداد کل: ${totalPlans})

🕰 آخرین بروزرسانی: ${now}`;
}

const PER_PAGE = 8;

export function buildPlansListKeyboard(plans, page = 1, perPage = PER_PAGE) {
  const totalPlans = plans.length;
  const totalPages = Math.ceil(totalPlans / perPage) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * perPage;
  const slice = plans.slice(start, start + perPage);
  const keyboard = [];
  if (totalPlans > 0) {
    for (const plan of slice) {
      const name = (plan.name || '').length > 22 ? (plan.name || '').substring(0, 22) + '...' : (plan.name || '');
      keyboard.push([
        { text: name, callback_data: `plan_detail_${plan.id}` }
      ]);
    }
    if (totalPages > 1) {
      const row = [];
      if (validPage > 1) row.push({ text: '◀️ قبلی', callback_data: `plan_list_page_${validPage - 1}` });
      if (validPage < totalPages) row.push({ text: 'بعدی ▶️', callback_data: `plan_list_page_${validPage + 1}` });
      if (row.length) keyboard.push(row);
    }
  }
  keyboard.push([{ text: '➕ افزودن پلن', callback_data: 'plan_add' }]);
  keyboard.push([{ text: '🔙 بازگشت به دسته‌بندی و پلن‌ها', callback_data: 'category_management' }]);
  return {
    inline_keyboard: keyboard,
    currentPage: validPage,
    totalPages,
    totalPlans
  };
}
