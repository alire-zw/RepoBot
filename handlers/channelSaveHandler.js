import { getPool } from '../services/database.js';
import { findChannelByID } from '../services/channelService.js';
import { isAdmin } from '../services/admin.js';
import { getChannelAddingState, clearChannelAddingState } from '../services/channelState.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !callbackData.startsWith('channel_save_')) {
    return;
  }

  const channelID = parseInt(callbackData.split('_')[2], 10);
  if (!channelID || isNaN(channelID)) {
    await ctx.answerCbQuery({ text: 'آیدی کانال نامعتبر است', show_alert: true });
    return;
  }

  try {
    const state = getChannelAddingState(userId);
    if (!state || !state.newChannels) {
      await ctx.answerCbQuery({ text: 'خطا: اطلاعات کانال یافت نشد', show_alert: true });
      return;
    }

    // پیدا کردن کانال در لیست کانال‌های جدید
    const channelData = state.newChannels.find(c => c.channelID === channelID);
    if (!channelData) {
      await ctx.answerCbQuery({ text: 'کانال یافت نشد', show_alert: true });
      return;
    }

    // بررسی دوباره که در دیتابیس نیست
    const existingChannel = await findChannelByID(channelID);
    if (existingChannel) {
      await ctx.answerCbQuery({ text: 'این کانال قبلاً اضافه شده است', show_alert: true });
      return;
    }

    // ذخیره کانال در دیتابیس
    const pool = getPool();
    await pool.query(
      `INSERT INTO channels (channelID, channelName, channelUsername, buttonLabel, inviteLink, isLocked, memberCount) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        channelData.channelID,
        channelData.channelName,
        channelData.channelUsername,
        'تایید عضویت',
        channelData.inviteLink,
        0, // isLocked = false
        channelData.memberCount
      ]
    );

    await ctx.answerCbQuery({ text: `✅ کانال "${channelData.channelName}" با موفقیت اضافه شد`, show_alert: false });

    // حذف کانال از لیست کانال‌های جدید
    state.newChannels = state.newChannels.filter(c => c.channelID !== channelID);

    // اگر کانال دیگری باقی مانده، لیست را بروزرسانی می‌کنیم
    if (state.newChannels.length > 0) {
      setChannelAddingState(userId, state);

      let message = `✅ <b>کانال ذخیره شد</b>\n\n`;
      message += `<b>کانال:</b> ${channelData.channelName}\n`;
      const username = channelData.channelUsername ? `@${channelData.channelUsername}` : 'ندارد';
      message += `<b>یوزرنیم:</b> ${username}\n`;
      message += `<b>آیدی:</b> <code>${channelData.channelID}</code>\n\n`;
      message += `<b>کانال‌های باقی‌مانده:</b> ${state.newChannels.length}\n\n`;
      message += `<b>لطفاً یکی از کانال‌های باقی‌مانده را انتخاب کنید:</b>`;

      // ساخت keyboard با دکمه‌های inline برای کانال‌های باقی‌مانده
      const keyboard = [];
      
      for (let i = 0; i < state.newChannels.length; i += 2) {
        const row = [];
        const ch1 = state.newChannels[i];
        if (ch1) {
          const buttonText1 = ch1.channelUsername ? `@${ch1.channelUsername}` : ch1.channelName.substring(0, 15);
          row.push({ text: buttonText1, callback_data: `channel_save_${ch1.channelID}` });
        }
        const ch2 = state.newChannels[i + 1];
        if (ch2) {
          const buttonText2 = ch2.channelUsername ? `@${ch2.channelUsername}` : ch2.channelName.substring(0, 15);
          row.push({ text: buttonText2, callback_data: `channel_save_${ch2.channelID}` });
        }
        if (row.length > 0) {
          keyboard.push(row);
        }
      }

      keyboard.push([
        { text: '🔙 بازگشت', callback_data: 'channel_management' }
      ]);

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
          console.log('[channelSaveHandler] Message not modified');
        } else {
          console.error('[channelSaveHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }
      }
    } else {
      // همه کانال‌ها ذخیره شدند
      clearChannelAddingState(userId);

      const username = channelData.channelUsername ? `@${channelData.channelUsername}` : 'ندارد';
      const message = `✅ <b>کانال با موفقیت ذخیره شد</b>\n\n<b>نام:</b> ${channelData.channelName}\n<b>یوزرنیم:</b> ${username}\n<b>آیدی:</b> <code>${channelData.channelID}</code>`;

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➕ افزودن کانال دیگر', callback_data: 'channel_add' },
                { text: '📋 مشاهده کانال‌ها', callback_data: 'channel_list' }
              ],
              [
                { text: '🔙 بازگشت', callback_data: 'channel_management' }
              ]
            ]
          }
        });
      } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
          console.log('[channelSaveHandler] Message not modified');
        } else {
          console.error('[channelSaveHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '➕ افزودن کانال دیگر', callback_data: 'channel_add' },
                  { text: '📋 مشاهده کانال‌ها', callback_data: 'channel_list' }
                ],
                [
                  { text: '🔙 بازگشت', callback_data: 'channel_management' }
                ]
              ]
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('[channelSaveHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در ذخیره کانال', show_alert: true });
  }
};

