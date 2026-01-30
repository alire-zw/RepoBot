import { getServersWithPlansWithCapacity } from '../services/planService.js';
import { getPurchaseState, setPurchaseState } from '../services/purchaseState.js';
import {
  getPurchaseSelectServerMessage,
  buildPurchaseServersKeyboard
} from '../helpers/purchaseHelpers.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  setPurchaseState(userId, { step: 'server' });
  let servers = [];
  try {
    servers = await getServersWithPlansWithCapacity();
  } catch (e) {
    console.error('purchaseBackToServer getServersWithPlansWithCapacity:', e);
    const errMsg = 'خطا در دریافت لیست سرورها.';
    try {
      await ctx.editMessageText(errMsg, backButton);
    } catch {
      await ctx.reply(errMsg, backButton);
    }
    return;
  }
  if (!servers || servers.length === 0) {
    const noMsg = 'در حال حاضر سروری با پلن دارای ظرفیت موجود نیست.';
    try {
      await ctx.editMessageText(noMsg, backButton);
    } catch {
      await ctx.reply(noMsg, backButton);
    }
    return;
  }
  const text = getPurchaseSelectServerMessage();
  const keyboard = buildPurchaseServersKeyboard(servers);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
