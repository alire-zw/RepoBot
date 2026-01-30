import { getPool } from '../services/database.js';
import { findChannelByID } from '../services/channelService.js';
import { isAdmin } from '../services/admin.js';
import channelListHandler from './channelListHandler.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const callbackData = ctx.callbackQuery?.data;
  let channelID = null;

  if (callbackData && callbackData.startsWith('channel_delete_confirm_')) {
    const idString = callbackData.replace('channel_delete_confirm_', '');
    channelID = parseInt(idString, 10);
  }

  if (!channelID || isNaN(channelID)) {
    await ctx.answerCbQuery({ text: 'آیدی کانال نامعتبر است', show_alert: true });
    return;
  }

  try {
    const channel = await findChannelByID(channelID);
    
    if (!channel) {
      await ctx.answerCbQuery({ text: 'کانال یافت نشد', show_alert: true });
      return;
    }

    const pool = getPool();
    await pool.query(
      'DELETE FROM channels WHERE channelID = ?',
      [channelID]
    );

    await ctx.answerCbQuery({ text: `✅ کانال "${channel.channelName}" حذف شد`, show_alert: false });

    // نمایش لیست کانال‌ها
    ctx.callbackQuery = { data: 'channel_list' };
    await channelListHandler(ctx);
  } catch (error) {
    console.error('[channelDeleteConfirmHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در حذف کانال', show_alert: true });
  }
};

