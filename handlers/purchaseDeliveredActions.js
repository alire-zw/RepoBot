/**
 * هندلرهای دکمه‌های زیر پیام تحویل اشتراک (آموزش اتصال، منو).
 * چون پیام تحویل همراه عکس QR است قابل ادیت نیست، پس محتوا در پیام جدید ارسال می‌شود.
 */

import config from '../config/env.js';
import { getMainMenuAsync } from '../keyboards/main.js';
import { getHelpMenuMessage, getHelpPlatformKeyboard } from '../helpers/helpTutorialHelpers.js';

/** آموزش اتصال — نمایش منوی انتخاب پلتفرم (همان بخش آموزش و راهنمایی) */
export async function purchaseDeliveredHelpHandler(ctx) {
  await ctx.answerCbQuery();
  const message = getHelpMenuMessage();
  const reply_markup = getHelpPlatformKeyboard();
  await ctx.reply(message, { parse_mode: 'HTML', reply_markup });
}

/** منو — ارسال همان پیام منوی اصلی / استارت در یک پیام جدید */
export async function purchaseDeliveredMenuHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const welcomeMessage = `👋 به <b>ربات فیلترشکن ${config.BOT_NAME}</b> <b>خوش آمدید.</b>

در این ربات می‌توانید به‌صورت <b>سریع و مطمئن</b> <b>اشتراک</b> خود را تهیه یا تمدید کنید و در صورت نیاز با <b>پشتیبانی</b> در ارتباط باشید.

👇 <b>لطفاً</b> از <b>منوی زیر</b> گزینه مورد نظر خود را انتخاب نمایید `;
  await ctx.reply(welcomeMessage, { parse_mode: 'HTML', ...(await getMainMenuAsync(userId)) });
}
