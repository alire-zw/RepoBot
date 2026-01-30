import { getChargeState, setChargeState } from '../services/chargeState.js';
import { getPaymentMethod, getPvUsername, isCardPaymentAvailable } from '../services/paymentSettingsService.js';
import { getChargePvMessage, buildPvPaymentKeyboard } from '../helpers/paymentHelpers.js';

export default async (ctx) => {
  try {
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('[chargeWallet] Error answering callback query:', error);
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  const method = await getPaymentMethod();
  if (method === 'pvid') {
    const pvUsername = await getPvUsername();
    const message = getChargePvMessage();
    const keyboard = buildPvPaymentKeyboard(pvUsername, '🔙 بازگشت', 'my_account');
    try {
      await ctx.editMessageText(message, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
    return;
  }

  const cardAvailable = await isCardPaymentAvailable();
  if (!cardAvailable) {
    try {
      await ctx.answerCbQuery({ text: 'سیستم شارژ در حال حاضر غیرفعال است. لطفاً در تنظیمات ربات روش واریز را تنظیم کنید.', show_alert: true });
    } catch (error) {
      console.error('[chargeWallet] Error sending alert:', error);
    }
    return;
  }

  try {
    const message = `💵 <b>شارژ کیف پول</b>

مبلغی که می‌خواهید کیف پول خود را شارژ کنید به صورت تومانی وارد کنید.

<b>⚠️ توجه:</b> کمتر از 20,000 تومان امکان شارژ وجود ندارد.`;

    let requestMessageId;
    const hasCallbackQuery = !!ctx.callbackQuery;
    const hasMessage = !!ctx.callbackQuery?.message;
    
    console.log('[chargeWallet] Message context:', {
      hasCallbackQuery,
      hasMessage,
      messageId: ctx.callbackQuery?.message?.message_id,
      chatId: ctx.callbackQuery?.message?.chat?.id
    });

    if (hasCallbackQuery && hasMessage) {
      try {
        console.log('[chargeWallet] Attempting to edit message');
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت', callback_data: 'my_account' }
              ]
            ]
          }
        });
        requestMessageId = ctx.callbackQuery?.message?.message_id;
        console.log('[chargeWallet] Message edited successfully, messageId:', requestMessageId);
      } catch (error) {
        console.error('[chargeWallet] Error editing message:', {
          error: error.message,
          description: error.description,
          code: error.code,
          response: error.response
        });
        
        if (error.description && error.description.includes('message is not modified')) {
          console.log('[chargeWallet] Message not modified (same content), using existing messageId');
          requestMessageId = ctx.callbackQuery?.message?.message_id;
        } else {
          console.log('[chargeWallet] Falling back to sending new message');
          try {
            const sentMessage = await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'my_account' }
                  ]
                ]
              }
            });
            requestMessageId = sentMessage.message_id;
            console.log('[chargeWallet] New message sent, messageId:', requestMessageId);
          } catch (replyError) {
            console.error('[chargeWallet] Error sending new message:', replyError);
            throw replyError;
          }
        }
      }
    } else {
      console.log('[chargeWallet] No callback query message, sending new message');
      try {
        const sentMessage = await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت', callback_data: 'my_account' }
              ]
            ]
          }
        });
        requestMessageId = sentMessage.message_id;
        console.log('[chargeWallet] New message sent (no callback query), messageId:', requestMessageId);
      } catch (replyError) {
        console.error('[chargeWallet] Error sending new message:', replyError);
        throw replyError;
      }
    }

    const finalMessageId = requestMessageId || ctx.callbackQuery?.message?.message_id;
    console.log('[chargeWallet] Setting charge state:', {
      userId,
      state: 'waiting_amount',
      messageId: finalMessageId
    });

    setChargeState(userId, {
      state: 'waiting_amount',
      amount: 0,
      requestMessageId: finalMessageId
    });

    console.log('[chargeWallet] Charge state set successfully');
  } catch (error) {
    console.error('[chargeWallet] Unhandled error:', {
      error: error.message,
      stack: error.stack,
      userId
    });
    try {
      await ctx.answerCbQuery({ text: 'خطا در شروع فرآیند شارژ', show_alert: true });
    } catch (alertError) {
      console.error('[chargeWallet] Error sending alert:', alertError);
    }
  }
};

