import { getChargeState, setChargeState } from '../services/chargeState.js';
import { getOneCardForPayment } from '../services/paymentSettingsService.js';
import { getChargeCardMessage } from '../helpers/paymentHelpers.js';

export default async (ctx) => {
  const userId = ctx.from.id;
  const state = getChargeState(userId);
  
  console.log('[chargeAmount] Handler called, userId:', userId);
  console.log('[chargeAmount] Current state:', state);
  
  if (!state || state.state !== 'waiting_amount') {
    console.log('[chargeAmount] No valid state or not waiting for amount, returning');
    return;
  }

  const text = ctx.message?.text;
  if (!text) {
    console.log('[chargeAmount] No text in message, returning');
    return;
  }

  console.log('[chargeAmount] Received text:', text);

  try {
    const cleanAmount = text.replace(/[,،\s]/g, '');
    const amount = parseInt(cleanAmount, 10);

    console.log('[chargeAmount] Parsed amount:', amount);

    if (isNaN(amount) || amount < 20000) {
      console.log('[chargeAmount] Amount is invalid or less than 20000');
      try {
        await ctx.deleteMessage();
        console.log('[chargeAmount] User message deleted');
      } catch (error) {
        console.log('[chargeAmount] Could not delete user message:', error.message);
      }

      const requestMessageId = state.requestMessageId;
      console.log('[chargeAmount] Request message ID:', requestMessageId);
      
      if (requestMessageId) {
        const warningMessage = `💵 <b>شارژ کیف پول</b>

مبلغی که می‌خواهید کیف پول خود را شارژ کنید به صورت تومانی وارد کنید.

<b>⚠️ توجه:</b> کمتر از 20,000 تومان امکان شارژ وجود ندارد.

<b>❌ هشدار:</b> مبلغ وارد شده کمتر از 20,000 تومان است. لطفاً مبلغی بیشتر از 20,000 تومان وارد کنید.`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            requestMessageId,
            null,
            warningMessage,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            }
          );
          console.log('[chargeAmount] Warning message edited successfully');
          console.log('[chargeAmount] State preserved, still waiting for amount');
        } catch (error) {
          console.error('[chargeAmount] Error editing warning message:', error.message);
        }
      }
      
      console.log('[chargeAmount] State remains in waiting_amount, user can try again');
      return;
    }

    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('[chargeAmount] Could not delete user message:', error.message);
    }

    const card = await getOneCardForPayment();
    if (!card) {
      await ctx.reply('❌ در حال حاضر امکان واریز از طریق کارت وجود ندارد. لطفاً با پشتیبانی تماس بگیرید.');
      return;
    }
    const message = getChargeCardMessage(amount, card.cardNumber, card.name);

    const requestMessageId = state.requestMessageId;
    if (requestMessageId) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          requestMessageId,
          null,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'charge_back_to_wallet' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.log('Could not edit message, sending new one:', error.message);
        const sentMessage = await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت', callback_data: 'charge_back_to_wallet' }
              ]
            ]
          }
        });
        setChargeState(userId, {
          state: 'waiting_receipt',
          amount: amount,
          messageId: sentMessage.message_id,
          requestMessageId: sentMessage.message_id,
          cardNumber: card.cardNumber,
          cardName: card.name
        });
        return;
      }
    } else {
      const sentMessage = await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔙 بازگشت', callback_data: 'charge_back_to_wallet' }
            ]
          ]
        }
      });
      setChargeState(userId, {
        state: 'waiting_receipt',
        amount: amount,
        messageId: sentMessage.message_id,
        requestMessageId: sentMessage.message_id,
        cardNumber: card.cardNumber,
        cardName: card.name
      });
      return;
    }

    setChargeState(userId, {
      state: 'waiting_receipt',
      amount: amount,
      messageId: requestMessageId,
      requestMessageId: requestMessageId,
      cardNumber: card.cardNumber,
      cardName: card.name
    });

  } catch (error) {
    console.error('Error in chargeAmount:', error);
    await ctx.reply('❌ خطا در پردازش مبلغ. لطفاً دوباره تلاش کنید.');
  }
};

