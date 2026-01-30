/**
 * متن‌ها و کیبورد بخش آموزش و راهنمایی اتصال با Hiddify
 * ساختار: منوی انتخاب پلتفرم، سپس صفحهٔ آموزش با لینک آخرین اشتراک (مشابه کانفیگ‌های من)، دکمهٔ شیشه‌ای دانلود، بازگشت به بخش آموزش.
 */

function escapeHtml(s) {
  if (s == null || s === '') return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** لینک‌های رسمی دانلود Hiddify برای هر پلتفرم */
export const HIDDIFY_DOWNLOAD_LINKS = {
  android: 'https://github.com/hiddify/hiddify-app/releases/download/v2.5.7/Hiddify-Android-universal.apk',
  windows: 'https://github.com/hiddify/hiddify-app/releases/download/v2.5.7/Hiddify-Windows-Setup-x64.exe',
  ios: 'https://apps.apple.com/mx/app/hiddify-proxy-vpn/id6596777532?l=en-GB',
  macos: 'https://apps.apple.com/mx/app/hiddify-proxy-vpn/id6596777532?l=en-GB'
};

/**
 * متن منوی آموزش (انتخاب پلتفرم)
 */
export function getHelpMenuMessage() {
  return `📚 <b>آموزش و راهنمایی</b>

نحوهٔ کار Hiddify در همهٔ پلتفرم‌ها تقریباً یکسان است. پلتفرم خود را انتخاب کنید تا راهنمای گام‌به‌گام و لینک دانلود مربوطه را ببینید.`;
}

/**
 * متن آموزش برای هر پلتفرم — اعداد لاتین، فاصله بین مراحل، مرحلهٔ کپی با لینک آخرین اشتراک (نمایش مشابه بخش کانفیگ‌های من).
 * @param {'android'|'ios'|'windows'|'macos'} platform
 * @param {{ connectionLink?: string, clientEmail?: string, planName?: string } | null} lastSubscription آخرین اشتراک کاربر از دیتابیس.
 */
export function getHelpTutorialMessage(platform, lastSubscription) {
  const titles = {
    android: '📱 آموزش اتصال — اندروید',
    ios: '🍎 آموزش اتصال — آی‌فون',
    windows: '🖥️ آموزش اتصال — ویندوز',
    macos: '🍎 آموزش اتصال — مک‌اواس'
  };

  const connectionLink = lastSubscription?.connectionLink?.trim() || null;
  const subName = lastSubscription?.clientEmail || lastSubscription?.planName || '';

  let step2 = '';
  if (connectionLink) {
    const nameLine = subName
      ? `📌 <b>نام اشتراک:</b> <code>${escapeHtml(String(subName))}</code>\n\n`
      : '';
    step2 = `2. لینک اتصال آخرین اشتراک شما در زیر است. <b>این لینک را کپی کنید و در Hiddify اضافه کنید.</b>

${nameLine}🔗 <b>لینک اتصال:</b>
<pre><code>${escapeHtml(connectionLink)}</code></pre>`;
  } else {
    step2 = `2. لینک اشتراک خود را از بخش <b>«کانفیگ‌های من»</b> در ربات کپی کنید و سپس در Hiddify اضافه کنید.`;
  }

  const steps = `1. اپلیکیشن <b>Hiddify</b> را نصب و راه‌اندازی کنید و دسترسی‌هایی که درخواست می‌کند را به آن بدهید.


${step2}


3. در Hiddify روی گزینه <b>«+»</b> (بالای صفحه) یا دکمه <b>«افزودن پروفایل»</b> (وسط صفحه) کلیک کنید و گزینه <b>«افزودن از طریق کلیپبورد»</b> را انتخاب کنید؛ پس از آن اشتراک اضافه خواهد شد.


4. از طریق دکمه <b>«اتصال»</b> در وسط صفحه می‌توانید فیلترشکن را روشن یا خاموش کنید.`;

  let extra = '';
  if (platform === 'windows') {
    extra = '\n\n💡 <b>نکته ویندوز:</b> به‌جای کلیک روی دکمهٔ افزودن، می‌توانید از میانبر <b>Ctrl+V</b> برای افزودن اشتراک از کلیپبورد استفاده کنید.';
  }

  return `${titles[platform]}\n\n${steps}${extra}\n\n🔗 لینک دانلود Hiddify برای این سیستم‌عامل را از دکمهٔ زیر دریافت کنید.`;
}

/**
 * برچسب دکمهٔ شیشه‌ای (URL) دانلود برای هر پلتفرم
 */
const DOWNLOAD_BUTTON_LABELS = {
  android: '🔗 دانلود Hiddify — اندروید',
  ios: '🔗 دانلود Hiddify — آی‌فون',
  windows: '🔗 دانلود Hiddify — ویندوز',
  macos: '🔗 دانلود Hiddify — مک‌اواس'
};

/**
 * کیبورد انتخاب پلتفرم برای بخش آموزش
 */
export function getHelpPlatformKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📱 اندروید', callback_data: 'help_android' },
        { text: '🍎 آی‌فون', callback_data: 'help_ios' }
      ],
      [
        { text: '🖥️ ویندوز', callback_data: 'help_windows' },
        { text: '🍎 مک‌اواس', callback_data: 'help_macos' }
      ],
      [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]
    ]
  };
}

/**
 * کیبورد صفحهٔ آموزش یک پلتفرم: دکمهٔ شیشه‌ای (URL) برای دانلود + بازگشت به بخش آموزش (نه منوی اصلی)
 * @param {'android'|'ios'|'windows'|'macos'} platform
 */
export function getHelpTutorialKeyboard(platform) {
  const url = HIDDIFY_DOWNLOAD_LINKS[platform];
  const label = DOWNLOAD_BUTTON_LABELS[platform];
  return {
    inline_keyboard: [
      [{ text: label, url }],
      [{ text: '🔙 بازگشت به بخش آموزش', callback_data: 'help' }]
    ]
  };
}
