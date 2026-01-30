/**
 * بازگشت از جزئیات/QR به لیست کانفیگ‌ها: ابتدا پیام فعلی را حذف می‌کنیم سپس لیست را با reply می‌فرستیم.
 */
import { ctxDeleteThenReply } from '../helpers/myConfigDetailHelpers.js';
import { sendMyConfigsList } from './myConfigsHandler.js';

export default async function myConfigBackHandler(ctx) {
  await ctx.answerCbQuery();
  await ctxDeleteThenReply(ctx, () => sendMyConfigsList(ctx, 1));
}
