import { isAdmin } from '../services/admin.js';
import { getPaymentMethod, getPvUsername, getPaymentCards, getSupportLink } from '../services/paymentSettingsService.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const [method, pvUsername, cards, supportLink] = await Promise.all([
    getPaymentMethod(),
    getPvUsername(),
    getPaymentCards(),
    getSupportLink()
  ]);

  const methodLabel = method === 'card' ? 'شماره کارت' : method === 'pvid' ? 'آیدی پیوی' : 'تنظیم نشده';
  const pvLine = pvUsername ? `\n<b>آیدی پیوی فعلی:</b> @${pvUsername.replace(/^@/, '')}` : '';
  const supportLine = supportLink ? `\n<b>لینک پشتیبانی:</b> ${supportLink}` : '';
  const cardsCount = cards.length;

  const message = `⚙️ <b>تنظیمات ربات</b>

<b>روش واریز/پرداخت کارت به کارت:</b> ${methodLabel}${pvLine}
${method === 'card' ? `\nتعداد کارت‌های ثبت‌شده: ${cardsCount}` : ''}${supportLine}

در این بخش می‌توانید روش واریز را روی <b>شماره کارت</b> یا <b>آیدی پیوی</b> قرار دهید و لینک پشتیبانی را تنظیم کنید (دکمهٔ پشتیبانی زیر پیام تحویل اشتراک).`;

  const keyboard = [
    [
      { text: method === 'card' ? '✅ شماره کارت' : 'شماره کارت', callback_data: 'bot_settings_method_card' },
      { text: method === 'pvid' ? '✅ آیدی پیوی' : 'آیدی پیوی', callback_data: 'bot_settings_method_pvid' }
    ]
  ];
  if (method === 'card') {
    keyboard.push([{ text: '📋 لیست شماره کارت‌ها', callback_data: 'bot_settings_cards_list' }]);
  } else if (method === 'pvid') {
    keyboard.push([{ text: '✏️ تنظیم آیدی پیوی', callback_data: 'bot_settings_pv_set' }]);
  }
  keyboard.push([{ text: '✏️ لینک پشتیبانی', callback_data: 'bot_settings_support_set' }]);
  keyboard.push([{ text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }]);

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
    }
  }
}
