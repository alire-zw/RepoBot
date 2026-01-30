/**
 * ساخت پیام و کیبورد بخش دسته‌بندی و پلن‌ها (مشابه بقیه بخش‌های ادمین)
 */

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

export function getCategoriesManagementMessage() {
  const now = formatDateLatin();
  return `<b>دسته‌بندی و پلن‌ها</b>

شما می‌توانید دسته‌بندی‌ها (مثل یک ماهه، دو ماهه، ده روزه) را از این بخش مدیریت کنید. در آینده پلن‌ها به این دسته‌بندی‌ها متصل می‌شوند.

🕰 آخرین بروزرسانی: ${now}`;
}

export function getCategoriesListMessage(currentPage, totalPages, totalCategories) {
  const now = formatDateLatin();

  if (totalCategories === 0) {
    return `📋 <b>لیست دسته‌بندی‌ها</b>

⚠️ هیچ دسته‌بندی ثبت نشده است.

🕰 آخرین بروزرسانی: ${now}`;
  }

  return `📋 <b>لیست دسته‌بندی‌ها</b>

صفحه ${currentPage} از ${totalPages} (تعداد کل: ${totalCategories})

🕰 آخرین بروزرسانی: ${now}`;
}

const PER_PAGE = 8;

/**
 * ساخت کیبورد لیست دسته‌بندی‌ها با pagination
 */
export function buildCategoriesListKeyboard(categories, page = 1, perPage = PER_PAGE) {
  const totalCategories = categories.length;
  const totalPages = Math.ceil(totalCategories / perPage) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const start = (validPage - 1) * perPage;
  const slice = categories.slice(start, start + perPage);

  const keyboard = [];

  if (totalCategories > 0) {
    keyboard.push([
      { text: '📌 نام', callback_data: 'categories_list_header' }
    ]);
    for (const cat of slice) {
      const name = cat.name.length > 20 ? cat.name.substring(0, 20) + '...' : cat.name;
      keyboard.push([
        { text: name, callback_data: `category_detail_${cat.id}` }
      ]);
    }
    if (totalPages > 1) {
      const paginationRow = [];
      if (validPage > 1) paginationRow.push({ text: '◀️ قبلی', callback_data: `category_list_page_${validPage - 1}` });
      if (validPage < totalPages) paginationRow.push({ text: 'بعدی ▶️', callback_data: `category_list_page_${validPage + 1}` });
      if (paginationRow.length) keyboard.push(paginationRow);
    }
  }

  keyboard.push([{ text: '➕ افزودن دسته‌بندی', callback_data: 'category_add' }]);
  keyboard.push([{ text: '🔙 بازگشت به دسته‌بندی و پلن‌ها', callback_data: 'category_management' }]);

  return {
    inline_keyboard: keyboard,
    currentPage: validPage,
    totalPages,
    totalCategories
  };
}
