/**
 * پیام‌های مربوط به واریز/شارژ کیف پول — کارت یا آیدی پیوی
 */

/** پیام واریز با شماره کارت (شارژ کیف پول) */
export function getChargeCardMessage(amount, cardNumber, cardName = '') {
  const formattedAmount = amount.toLocaleString('en-US');
  const nameLine = cardName ? `\n<b>نام صاحب کارت:</b> ${cardName}` : '';
  return `💳 <b>واریز به حساب</b>

<b>مبلغ:</b> ${formattedAmount} تومان

<b>شماره کارت:</b> <code>${cardNumber || '—'}</code>${nameLine}

لطفاً مبلغ را به این کارت واریز کنید و منتظر تایید ادمین باشید.

پس از واریز، تصویر رسید پرداخت را ارسال کنید.`;
}

/** پیام شارژ از طریق پیوی (معذرت‌خواهی؛ لینک در دکمه) */
export function getChargePvMessage() {
  return `💬 <b>شارژ کیف پول از طریق پیوی</b>

با عرض پوزش، در حال حاضر واریز از طریق <b>شماره کارت</b> در ربات فعال نیست.

برای شارژ حساب و واریز، روی دکمهٔ زیر بزنید تا به پیوی ادمین منتقل شوید.`;
}

/** کیبورد پرداخت/شارژ از طریق پیوی: دکمهٔ شیشه‌ای انتقال به پیوی + دکمهٔ بازگشت/انصراف */
export function buildPvPaymentKeyboard(pvUsername, backButtonText, backCallbackData) {
  const user = (pvUsername || '').replace(/^@/, '');
  const rows = [];
  if (user) {
    rows.push([{ text: '💬 ارتباط با پیوی ادمین', url: `https://t.me/${user}` }]);
  }
  rows.push([{ text: backButtonText, callback_data: backCallbackData }]);
  return { inline_keyboard: rows };
}
