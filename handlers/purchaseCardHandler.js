import { getPurchaseState, setPurchaseState } from '../services/purchaseState.js';
import {
  getPurchaseCardMessage,
  getPurchasePvMessage
} from '../helpers/purchaseHelpers.js';
import { buildPvPaymentKeyboard } from '../helpers/paymentHelpers.js';
import { getPaymentMethod, getPvUsername, getOneCardForPayment } from '../services/paymentSettingsService.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const state = getPurchaseState(userId);
  if (!state || state.step !== 'payment' || !state.plan) {
    try {
      await ctx.editMessageText('لطفاً از ابتدا مراحل خرید را انجام دهید.', backButton);
    } catch {
      await ctx.reply('لطفاً از ابتدا مراحل خرید را انجام دهید.', backButton);
    }
    return;
  }
  const plan = state.plan;
  const method = await getPaymentMethod();
  const keyboard = {
    inline_keyboard: [[{ text: '🔙 انصراف', callback_data: 'back_to_main' }]]
  };
  if (method === 'pvid') {
    const pvUsername = await getPvUsername();
    const text = getPurchasePvMessage(plan);
    const pvKeyboard = buildPvPaymentKeyboard(pvUsername, '🔙 انصراف', 'back_to_main');
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: pvKeyboard });
    } catch {
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: pvKeyboard });
    }
    return;
  }
  const card = await getOneCardForPayment();
  if (!card) {
    try {
      await ctx.editMessageText('در حال حاضر پرداخت کارت به کارت غیرفعال است. لطفاً با پشتیبانی تماس بگیرید.', { reply_markup: keyboard });
    } catch {
      await ctx.reply('در حال حاضر پرداخت کارت به کارت غیرفعال است. لطفاً با پشتیبانی تماس بگیرید.', { reply_markup: keyboard });
    }
    return;
  }
  const requestMessageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  setPurchaseState(userId, { ...state, step: 'waiting_plan_order_receipt', requestMessageId, chatId });
  const text = getPurchaseCardMessage(plan, card.cardNumber, card.name);
  try {
    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: keyboard });
  } catch {
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard });
  }
};
