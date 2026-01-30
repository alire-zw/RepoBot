/**
 * پیام‌ها و کیبوردهای بخش خرید اشتراک
 */

export const PURCHASE_PER_PAGE = 6;

/** حداکثر طول متن دکمه (برای جلوگیری از برش ناجور) */
const BUTTON_TEXT_MAX = 32;

/** انتخاب سرور */
export function getPurchaseSelectServerMessage() {
  return `🖥️ <b>انتخاب سرور</b>

برای شروع خرید اشتراک، ابتدا <b>سرویس مورد نظر خود</b> را انتخاب کنید.

سرورهای زیر همگی فعال و دارای پلن با ظرفیت هستند؛ با خیال راحت هر کدام را که ترجیح می‌دهید انتخاب کنید. پس از خرید، پشتیبانی در کنار شماست.`;
}

export function buildPurchaseServersKeyboard(servers) {
  const keyboard = [];
  for (const s of servers) {
    const name = (s.serverName || '').length > BUTTON_TEXT_MAX
      ? (s.serverName || '').substring(0, BUTTON_TEXT_MAX - 1) + '…'
      : (s.serverName || '');
    keyboard.push([{ text: name, callback_data: `purchase_server_${s.id}` }]);
  }
  keyboard.push([{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }]);
  return { inline_keyboard: keyboard };
}

/** انتخاب دسته‌بندی (مدت زمان) */
export function getPurchaseSelectCategoryMessage() {
  return `📂 <b>انتخاب مدت زمان اشتراک</b>

حالا <b>مدت زمانی</b> که می‌خواهید اشتراک داشته باشید را انتخاب کنید.

هر گزینه نشان‌دهندهٔ دورهٔ اشتراک (مثلاً یک‌ماهه، سه‌ماهه و…) است. با توجه به نیاز خود یکی را انتخاب کنید تا لیست پلن‌های موجود برای همان مدت نمایش داده شود.`;
}

export function buildPurchaseCategoriesKeyboard(categories) {
  const keyboard = [];
  for (const c of categories) {
    const name = (c.name || '').length > BUTTON_TEXT_MAX
      ? (c.name || '').substring(0, BUTTON_TEXT_MAX - 1) + '…'
      : (c.name || '');
    keyboard.push([{ text: name, callback_data: `purchase_cat_${c.id}` }]);
  }
  keyboard.push([{ text: '🔙 بازگشت به انتخاب سرور', callback_data: 'buy_subscription' }]);
  return { inline_keyboard: keyboard };
}

/** انتخاب پلن */
export function getPurchaseSelectPlanMessage() {
  return `📋 <b>انتخاب پلن اشتراک</b>

در این مرحله <b>پلن مورد نظر خود</b> را انتخاب کنید.

هر پلن شامل حجم و مدت مشخص و قیمت نهایی است. با اطمینان هر کدام را که به کار شما می‌آید انتخاب کنید؛ پس از پرداخت، اشتراک شما در اسرع وقت فعال می‌شود.`;
}

export function buildPurchasePlansKeyboard(plans) {
  const keyboard = [];
  for (const p of plans) {
    const priceStr = (p.priceToman || 0).toLocaleString('en-US');
    const label = `${p.name || ''} — ${priceStr} تومان`;
    const text = label.length > BUTTON_TEXT_MAX
      ? label.substring(0, BUTTON_TEXT_MAX - 1) + '…'
      : label;
    keyboard.push([{ text, callback_data: `purchase_plan_${p.id}` }]);
  }
  keyboard.push([{ text: '🔙 بازگشت به انتخاب سرور', callback_data: 'purchase_back_to_server' }]);
  return { inline_keyboard: keyboard };
}

/** مرحله پرداخت — balance اختیاری (موجودی کیف پول به تومان) */
export function getPurchasePaymentMessage(plan, balance = null) {
  const price = (plan.priceToman || 0).toLocaleString('en-US');
  const planName = plan.name || '';
  const categoryName = plan.categoryName || '';
  const planLine = categoryName
    ? `پلن انتخاب‌شده: <b>${planName}</b> (${categoryName})`
    : `پلن انتخاب‌شده: <b>${planName}</b>`;
  const balanceStr = balance !== null && balance !== undefined
    ? (Number(balance)).toLocaleString('en-US')
    : null;
  const balanceLine = balanceStr !== null
    ? `موجودی کیف پول شما: <b>${balanceStr}</b> تومان\n\n`
    : '';
  return `💳 <b>مرحلهٔ پرداخت</b>

${planLine}
مبلغ قابل پرداخت: <b>${price}</b> تومان
${balanceLine}می‌توانید با <b>کیف پول</b> (پرداخت آنی و تحویل فوری) یا با <b>کارت به کارت</b> (واریز و ارسال رسید برای تایید) پرداخت کنید. هر دو روش امن و تحت نظر پشتیبانی هستند.`;
}

export function buildPurchasePaymentKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '💰 پرداخت با کیف پول (تحویل فوری)', callback_data: 'purchase_wallet' }],
      [{ text: '💳 پرداخت کارت به کارت (واریز + ارسال رسید)', callback_data: 'purchase_card' }],
      [{ text: '🔙 انصراف از خرید', callback_data: 'back_to_main' }]
    ]
  };
}

/** پیام کارت به کارت — cardName اختیاری برای نمایش نام صاحب کارت */
export function getPurchaseCardMessage(plan, cardNumber, cardName = '') {
  const price = (plan.priceToman || 0).toLocaleString('en-US');
  const nameLine = cardName ? `\n<b>نام صاحب کارت:</b> ${cardName}` : '';
  return `💳 <b>پرداخت کارت به کارت</b>

لطفاً <b>دقیقاً مبلغ ${price} تومان</b> را به شماره کارت زیر واریز کنید.

<b>شماره کارت:</b>
<code>${cardNumber || '—'}</code>${nameLine}

پس از واریز، <b>تصویر رسید پرداخت</b> (عکس فیش یا اسکرین‌شات) را همین‌جا در چت ارسال کنید. پس از بررسی توسط تیم پشتیبانی (معمولاً در کمتر از ۱۵ دقیقه)، اشتراک شما فعال و تحویل داده می‌شود.`;
}

/** پیام پرداخت از طریق پیوی (معذرت‌خواهی؛ لینک در دکمه) */
export function getPurchasePvMessage(plan) {
  const price = (plan.priceToman || 0).toLocaleString('en-US');
  return `💬 <b>پرداخت از طریق پیوی</b>

با عرض پوزش، در حال حاضر واریز از طریق <b>شماره کارت</b> در ربات فعال نیست.

برای پرداخت مبلغ <b>${price} تومان</b> و تکمیل خرید، روی دکمهٔ زیر بزنید تا به پیوی ادمین منتقل شوید.`;
}

/** پیام تحویل کلاینت بعد از تایید (هم برای caption عکس QR هم برای متن) — متن طولانی، حرفه‌ای و خفن با ایموجی */
export function getPurchaseDeliveredMessage(clientConfig) {
  return `✅ <b>اشتراک شما با موفقیت فعال شد!</b> 🎉

با تشکر از انتخاب و اعتماد شما؛ اشتراک شما آمادهٔ استفاده است و تمام جزئیات آن در بخش زیر قرار دارد. می‌توانید از همین الان از سرویس لذت ببرید. 🚀

${clientConfig || 'کلاینت شما با موفقیت ساخته شد. در صورت نیاز به لینک اشتراک یا راهنمایی با پشتیبانی تماس بگیرید.'}

هر زمان سؤالی داشتید یا به راهنمایی نیاز بود، تیم پشتیبانی آمادهٔ کمک به شماست. 💬🙏`;
}

/** کیبورد زیر پیام تحویل: ردیف اول آموزش + پشتیبانی، ردیف دوم بازگشت به منو */
export function getPurchaseDeliveredKeyboard(supportLink = '') {
  return {
    inline_keyboard: [
      [
        { text: '📚 آموزش اتصال', callback_data: 'purchase_delivered_help' },
        { text: '💬 پشتیبانی', url: supportLink || 'https://t.me/telegram' }
      ],
      [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'purchase_delivered_menu' }]
    ]
  };
}

/** ساخت تصویر QR مربع از لینک اشتراک (PNG buffer) */
export async function generateQrBuffer(link) {
  if (!link || typeof link !== 'string') return null;
  const QRCode = (await import('qrcode')).default;
  return await QRCode.toBuffer(link, { type: 'png', width: 400, margin: 2 });
}
