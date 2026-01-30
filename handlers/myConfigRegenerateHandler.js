import crypto from 'crypto';
import { getSubscriptionById } from '../services/userSubscriptionService.js';
import { updateSubscriptionConnectionLink } from '../services/userSubscriptionService.js';
import { findPlanById } from '../services/planService.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import {
  getClientFromInbound,
  updateClientInbound,
  getServerInbounds,
  buildClientConnectionLink,
  getClientTrafficsByEmail
} from '../services/serverService.js';
import { getMyConfigDetailMessage, buildMyConfigDetailKeyboard } from '../helpers/myConfigHelpers.js';

export default async function myConfigRegenerateHandler(ctx) {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('myconfig_regen_')) return;
  const subId = parseInt(data.replace('myconfig_regen_', ''), 10);
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
  const inboundId = sub.inboundId || plan?.inboundId;
  if (!inboundId) {
    await ctx.answerCbQuery({ text: 'اینباند اشتراک یافت نشد', show_alert: true });
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

  const oldUuid = client.id || client.password;
  const newUuid = crypto.randomUUID && crypto.randomUUID() || crypto.randomBytes(16).toString('hex');

  const protocol = (await getServerInbounds(server)).find((ib) => String(ib.id) === String(inboundId))?.protocol || '';
  const isTrojan = (protocol || '').toLowerCase() === 'trojan';
  const clientPayload = { ...client };
  if (isTrojan) {
    clientPayload.password = newUuid;
  } else {
    clientPayload.id = newUuid;
  }

  const updateResult = await updateClientInbound(server, inboundId, oldUuid, clientPayload);
  if (!updateResult.success) {
    await ctx.answerCbQuery({ text: 'خطا در به‌روزرسانی پنل: ' + (updateResult.error || ''), show_alert: true });
    return;
  }

  const inbounds = await getServerInbounds(server);
  const inbound = inbounds.find((ib) => String(ib.id) === String(inboundId));
  const newLink = inbound ? buildClientConnectionLink(server, inbound, newUuid, sub.clientEmail) : null;
  if (newLink) {
    await updateSubscriptionConnectionLink(sub.id, newLink);
    sub.connectionLink = newLink;
  }

  const live = await getClientTrafficsByEmail(server, sub.clientEmail);
  const message = getMyConfigDetailMessage(sub, live);
  const keyboard = buildMyConfigDetailKeyboard(sub.id, sub, live);

  try {
    await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
  }
}
