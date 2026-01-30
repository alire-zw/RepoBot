import { Markup } from 'telegraf';
import { isAdmin } from '../services/admin.js';
import { getTrialEnabled } from '../services/panelSettingsService.js';
import { getSupportLink, getPvUsername } from '../services/paymentSettingsService.js';
import config from '../config/env.js';

export const getMainMenu = (userId) => {
  const buttons = [
    [Markup.button.callback('🛒 خرید اشتراک جدید', 'buy_subscription')],
    [
      Markup.button.callback('🙋🏻‍♂️ حساب کاربری من', 'my_account'),
      Markup.button.callback('📟 کانفیگ های من', 'my_configs')
    ],
    [Markup.button.callback('📚 آموزش و راهنمایی', 'help')]
  ];

  if (isAdmin(userId)) {
    buttons.push([Markup.button.callback('👨🏻‍💻 ادمین', 'admin_panel')]);
  }

  return Markup.inlineKeyboard(buttons);
};

/** منوی اصلی با دکمه اشتراک تست در صورت فعال بودن */
export async function getMainMenuAsync(userId) {
  const trialOn = await getTrialEnabled();
  const buttons = [
    [Markup.button.callback('🛒 خرید اشتراک جدید', 'buy_subscription')],
    [
      Markup.button.callback('🙋🏻‍♂️ حساب کاربری من', 'my_account'),
      Markup.button.callback('📟 کانفیگ های من', 'my_configs')
    ]
  ];
  if (trialOn) {
    buttons.push([Markup.button.callback('🧪 دریافت اشتراک تست', 'trial_claim')]);
  }
  const supportLinkSetting = await getSupportLink();
  const pvUsername = await getPvUsername();
  const supportLinkFromPv = pvUsername ? `https://t.me/${pvUsername.replace(/^@/, '')}` : '';
  const supportUrl = supportLinkSetting || supportLinkFromPv || config.SUPPORT_LINK || 'https://t.me/telegram';
  buttons.push([
    Markup.button.callback('📚 آموزش و راهنمایی', 'help'),
    Markup.button.url('💬 پشتیبانی', supportUrl)
  ]);
  if (isAdmin(userId)) {
    buttons.push([Markup.button.callback('👨🏻‍💻 پنل مدیریت ربات', 'admin_panel')]);
  }
  return Markup.inlineKeyboard(buttons);
}

export const backButton = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 بازگشت به منوی اصلی', 'back_to_main')]
]);

