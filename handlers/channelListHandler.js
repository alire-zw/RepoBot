import { getAllChannels } from '../services/channelService.js';
import { isAdmin } from '../services/admin.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const channels = await getAllChannels();

    if (channels.length === 0) {
      const message = `📋 <b>مشاهده کانال‌ها</b>\n\nهیچ کانالی ثبت نشده است.`;

      const keyboard = [
        [
          { text: '➕ افزودن کانال', callback_data: 'channel_add' }
        ],
        [
          { text: '🔙 بازگشت', callback_data: 'channel_management' }
        ]
      ];

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
          console.log('[channelListHandler] Message not modified');
        } else {
          console.error('[channelListHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }
      }
      return;
    }

    // نمایش کانال‌ها با pagination (5 کانال در هر صفحه)
    const page = 1; // برای شروع صفحه اول
    const itemsPerPage = 5;
    const totalPages = Math.ceil(channels.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const channelsToShow = channels.slice(startIndex, endIndex);

    let message = `📋 <b>مشاهده کانال‌ها</b>\n\n`;
    message += `<b>تعداد کل:</b> ${channels.length}\n`;
    message += `<b>صفحه:</b> ${page} از ${totalPages}\n\n`;

    channelsToShow.forEach((channel, index) => {
      const username = channel.channelUsername ? `@${channel.channelUsername}` : 'ندارد';
      const lockStatus = channel.isLocked === 1 ? '🔒 قفل' : '🔓 باز';
      message += `${startIndex + index + 1}. ${channel.channelName}\n`;
      message += `   یوزرنیم: ${username}\n`;
      message += `   آیدی: <code>${channel.channelID}</code>\n`;
      message += `   وضعیت: ${lockStatus}\n\n`;
    });

    // ساخت keyboard
    const keyboard = [];

    // دکمه‌های صفحه‌بندی (اگر بیشتر از یک صفحه باشد)
    if (totalPages > 1) {
      const paginationRow = [];
      if (page > 1) {
        paginationRow.push({ text: '⬅️ قبلی', callback_data: `channel_list_page_${page - 1}` });
      }
      if (page < totalPages) {
        paginationRow.push({ text: '➡️ بعدی', callback_data: `channel_list_page_${page + 1}` });
      }
      if (paginationRow.length > 0) {
        keyboard.push(paginationRow);
      }
    }

    // دکمه‌های مدیریت برای هر کانال
    channelsToShow.forEach(channel => {
      keyboard.push([
        { text: `🔍 ${channel.channelName.substring(0, 20)}`, callback_data: `channel_detail_${channel.channelID}` }
      ]);
    });

    keyboard.push([
      { text: '➕ افزودن کانال', callback_data: 'channel_add' }
    ]);
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
        console.log('[channelListHandler] Message not modified');
      } else {
        console.error('[channelListHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[channelListHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش لیست کانال‌ها', show_alert: true });
  }
};

