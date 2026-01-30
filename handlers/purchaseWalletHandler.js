import { getPurchaseState, clearPurchaseState } from '../services/purchaseState.js';
import {
  findServerByDatabaseID,
  getServerInbounds,
  getNextClientNumber,
  addClientToInbound,
  buildClientConnectionLink
} from '../services/serverService.js';
import { getUserBalance, updateUserBalance } from '../services/walletService.js';
import { getSupportLink, getPvUsername } from '../services/paymentSettingsService.js';
import { decrementPlanCapacity } from '../services/planService.js';
import { createUserSubscription } from '../services/userSubscriptionService.js';
import {
  getPurchaseDeliveredMessage,
  getPurchaseDeliveredKeyboard,
  generateQrBuffer
} from '../helpers/purchaseHelpers.js';
import config from '../config/env.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  const userId = ctx.from.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'payment' || !state.plan) {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText('لطفاً از ابتدا مراحل خرید را انجام دهید.', backButton);
    } catch {
      await ctx.reply('لطفاً از ابتدا مراحل خرید را انجام دهید.', backButton);
    }
    return;
  }
  const plan = state.plan;
  const balance = await getUserBalance(userId);
  if (balance < plan.priceToman) {
    const need = (plan.priceToman - balance).toLocaleString('en-US');
    const priceStr = (plan.priceToman || 0).toLocaleString('en-US');
    await ctx.answerCbQuery();
    const modalMsg = `⚠️ <b>موجودی کیف پول کافی نیست</b>

موجودی شما: <b>${(balance || 0).toLocaleString('en-US')}</b> تومان
مبلغ این خرید: <b>${priceStr}</b> تومان

برای تکمیل خرید به <b>${need}</b> تومان دیگر نیاز دارید.
لطفاً ابتدا از بخش «حساب کاربری من» کیف پول را شارژ کنید.`;
    const keyboard = {
      inline_keyboard: [[{ text: 'متوجه شدم', callback_data: 'purchase_insufficient_dismiss' }]]
    };
    try {
      await ctx.editMessageText(modalMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch {
      await ctx.reply(modalMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    return;
  }
  await ctx.answerCbQuery();
  const server = await findServerByDatabaseID(state.serverId);
  if (!server) {
    try {
      await ctx.editMessageText('سرور یافت نشد. لطفاً دوباره تلاش کنید.', backButton);
    } catch {
      await ctx.reply('سرور یافت نشد. لطفاً دوباره تلاش کنید.', backButton);
    }
    clearPurchaseState(userId);
    return;
  }
  const remarkPrefix = (server.remark || server.serverName || '').trim() || 'client';
  let inbound = null;
  try {
    const inbounds = await getServerInbounds(server);
    inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(plan.inboundId));
  } catch (e) {
    console.error('purchaseWallet getServerInbounds:', e?.message);
  }
  const nextNum = await getNextClientNumber(server, plan.inboundId, remarkPrefix);
  const clientEmail = `${remarkPrefix} - ${nextNum}`;
  const expireTime = plan.durationDays
    ? Date.now() + plan.durationDays * 24 * 60 * 60 * 1000
    : 0;
  const addResult = await addClientToInbound(server, plan.inboundId, clientEmail, {
    totalGB: plan.volumeGB,
    expiryTime: expireTime
  });
  if (!addResult.success) {
    try {
      await ctx.editMessageText(
        `خطا در ساخت کلاینت: ${addResult.error || 'نامشخص'}. لطفاً با پشتیبانی تماس بگیرید.`,
        backButton
      );
    } catch {
      await ctx.reply(
        `خطا در ساخت کلاینت: ${addResult.error || 'نامشخص'}. لطفاً با پشتیبانی تماس بگیرید.`,
        backButton
      );
    }
    clearPurchaseState(userId);
    return;
  }
  try {
    await updateUserBalance(userId, -plan.priceToman);
  } catch (e) {
    console.error('purchaseWallet updateUserBalance:', e);
    try {
      await ctx.editMessageText('خطا در کسر موجودی. لطفاً با پشتیبانی تماس بگیرید.', backButton);
    } catch {
      await ctx.reply('خطا در کسر موجودی. لطفاً با پشتیبانی تماس بگیرید.', backButton);
    }
    clearPurchaseState(userId);
    return;
  }
  await decrementPlanCapacity(plan.id);
  clearPurchaseState(userId);
  let connectionLink = null;
  if (inbound && addResult.uuid) {
    connectionLink = buildClientConnectionLink(server, inbound, addResult.uuid, clientEmail);
  }
  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nameLine = `📌 <b>نام اشتراک:</b> <code>${escapeHtml(clientEmail)}</code>\n\n`;
  const configText = connectionLink
    ? nameLine + `🔗 <b>لینک اتصال:</b>\n\n<pre><code>${escapeHtml(connectionLink)}</code></pre>`
    : nameLine + `📌 شناسه کلاینت: <code>${escapeHtml(clientEmail)}</code>\n\nدر صورت نیاز به لینک اشتراک با پشتیبانی تماس بگیرید. 💬`;
  const deliveredMsg = getPurchaseDeliveredMessage(configText);
  const supportLinkSetting = await getSupportLink();
  const pvUsername = await getPvUsername();
  const supportLinkFromPv = pvUsername ? `https://t.me/${pvUsername.replace(/^@/, '')}` : '';
  const supportLink = supportLinkSetting || supportLinkFromPv || config.SUPPORT_LINK;
  const keyboard = getPurchaseDeliveredKeyboard(supportLink);
  try {
    await createUserSubscription({
      userID: userId,
      planId: plan.id,
      inboundId: String(plan.inboundId || ''),
      planName: plan.name,
      serverId: server.id,
      serverName: server.serverName || '',
      volumeGB: plan.volumeGB,
      durationDays: plan.durationDays,
      connectionLink,
      clientEmail,
      expiryTime: expireTime || null,
      paymentMethod: 'wallet',
      planOrderId: null
    });
  } catch (e) {
    console.error('purchaseWallet createUserSubscription:', e?.message);
  }
  try {
    await ctx.editMessageText('✅ پرداخت با موفقیت انجام شد. اشتراک شما در پیام زیر تحویل داده شد.', { parse_mode: 'HTML' });
  } catch {
    // ignore edit
  }
  try {
    if (connectionLink) {
      const qrBuffer = await generateQrBuffer(connectionLink);
      if (qrBuffer) {
        await ctx.replyWithPhoto({ source: qrBuffer }, {
          caption: deliveredMsg,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    } else {
      await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  } catch (e) {
    console.error('purchaseWallet send delivery:', e?.message);
    await ctx.reply(deliveredMsg, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
