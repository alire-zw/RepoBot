import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import { createRenewal } from '../services/renewalService.js';
import { getUserBalance, updateUserBalance } from '../services/walletService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import {
  getClientFromInbound,
  updateClientInbound
} from '../services/serverService.js';
import { getMyConfigDetailMessage, buildMyConfigDetailKeyboard } from '../helpers/myConfigHelpers.js';
import { getClientTrafficsByEmail } from '../services/serverService.js';

export default async function myConfigRenewWalletHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('myconfig_renew_wallet_')) return;
  const subId = parseInt(data.replace('myconfig_renew_wallet_', ''), 10);
  if (!subId || isNaN(subId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const sub = await getSubscriptionById(subId);
  if (!sub || Number(sub.userID) !== Number(userId)) {
    await ctx.answerCbQuery({ text: 'اشتراک یافت نشد', show_alert: true });
    return;
  }

  const plan = await findPlanById(sub.planId);
  if (!plan) {
    await ctx.answerCbQuery({ text: 'پلن یافت نشد', show_alert: true });
    return;
  }

  const balance = await getUserBalance(userId);
  if (balance < plan.priceToman) {
    const need = (plan.priceToman - balance).toLocaleString('en-US');
    await ctx.answerCbQuery({
      text: `موجودی کیف پول کافی نیست. به ${need} تومان دیگر نیاز دارید.`,
      show_alert: true
    });
    return;
  }

  const inboundId = sub.inboundId || plan.inboundId;
  if (!inboundId) {
    await ctx.answerCbQuery({ text: 'اینباند یافت نشد', show_alert: true });
    return;
  }

  const server = await findServerByDatabaseID(sub.serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }

  const client = await getClientFromInbound(server, inboundId, sub.clientEmail);
  if (!client) {
    await ctx.answerCbQuery({ text: 'کلاینت در پنل یافت نشد', show_alert: true });
    return;
  }

  const currentTotalBytes = Number(client.totalGB) || 0;
  const addBytes = Math.floor(Number(plan.volumeGB) * 1024 * 1024 * 1024);
  const newTotalBytes = currentTotalBytes + addBytes;

  const nowMs = Date.now();
  const currentExpiry = Number(client.expiryTime) || 0;
  const baseExpiry = currentExpiry > 0 && currentExpiry > nowMs ? currentExpiry : nowMs;
  const extendMs = (plan.durationDays || 0) * 24 * 60 * 60 * 1000;
  const newExpiryTime = baseExpiry + extendMs;

  const clientPayload = { ...client, totalGB: newTotalBytes, expiryTime: newExpiryTime };
  const clientUuid = client.id || client.password;

  const updateResult = await updateClientInbound(server, inboundId, clientUuid, clientPayload);
  if (!updateResult.success) {
    await ctx.answerCbQuery({ text: 'خطا در به‌روزرسانی پنل: ' + (updateResult.error || ''), show_alert: true });
    return;
  }

  try {
    await updateUserBalance(userId, -plan.priceToman);
  } catch (e) {
    console.error('myConfigRenewWallet updateUserBalance:', e?.message);
    await ctx.answerCbQuery({ text: 'خطا در کسر موجودی', show_alert: true });
    return;
  }

  try {
    await createRenewal({
      userID: userId,
      subscriptionId: sub.id,
      planId: plan.id,
      amount: plan.priceToman,
      paymentMethod: 'wallet',
      status: 'completed'
    });
  } catch (e) {
    console.error('myConfigRenewWallet createRenewal:', e?.message);
  }

  const live = await getClientTrafficsByEmail(server, sub.clientEmail);
  const message = getMyConfigDetailMessage(sub, live) + '\n\n✅ <b>تمدید با کیف پول با موفقیت انجام شد.</b> حجم و زمان به اشتراک شما اضافه شد.';
  const keyboard = buildMyConfigDetailKeyboard(sub.id, sub, live);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
