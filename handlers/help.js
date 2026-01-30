/**
 * هندلر بخش آموزش و راهنمایی اتصال با Hiddify
 * ساختار مشابه سایر بخش‌های کاربری: منوی انتخاب پلتفرم، سپس صفحهٔ آموزش با لینک آخرین اشتراک، دکمهٔ دانلود و بازگشت به بخش آموزش.
 */

import { getUserSubscriptions } from '../services/userSubscriptionService.js';
import {
  getHelpMenuMessage,
  getHelpTutorialMessage,
  getHelpPlatformKeyboard,
  getHelpTutorialKeyboard
} from '../helpers/helpTutorialHelpers.js';

/** منوی آموزش — نمایش انتخاب پلتفرم */
export default async function helpHandler(ctx) {
  await ctx.answerCbQuery();
  const message = getHelpMenuMessage();
  const reply_markup = getHelpPlatformKeyboard();
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup
    });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup });
  }
}

/**
 * نمایش آموزش مخصوص یک پلتفرم (اندروید، آی‌فون، ویندوز، مک‌اواس)
 * لینک آخرین اشتراک کاربر از دیتابیس گرفته شده و مشابه بخش کانفیگ‌های من نمایش داده می‌شود.
 */
export async function helpPlatformHandler(ctx, platform) {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  let lastSubscription = null;
  if (userId) {
    const subs = await getUserSubscriptions(userId);
    if (subs && subs.length > 0) {
      lastSubscription = subs[0];
    }
  }
  const message = getHelpTutorialMessage(platform, lastSubscription);
  const reply_markup = getHelpTutorialKeyboard(platform);
  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup
    });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup });
  }
}
