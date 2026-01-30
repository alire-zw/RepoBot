import { checkUserMembershipInAllChannels } from '../services/channelMembershipService.js';
import { getChannelMembershipKeyboard, getChannelMembershipMessage } from '../helpers/channelMembershipHelpers.js';
import { getMainMenuAsync } from '../keyboards/main.js';
import config from '../config/env.js';
import { saveOrUpdateUser } from '../services/userService.js';
import { handleReferral } from '../services/referralService.js';
import { getPool } from '../services/database.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  try {
    const membershipCheck = await checkUserMembershipInAllChannels(ctx.telegram, userId);

    if (!membershipCheck.allJoined) {
      const keyboard = await getChannelMembershipKeyboard(ctx.telegram, userId);
      const message = getChannelMembershipMessage();

      try {
        await ctx.editMessageText(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
          console.log('[verifyMembershipHandler] Message not modified');
        } else {
          console.error('[verifyMembershipHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: keyboard
          });
        }
      }

      await ctx.answerCbQuery({ text: 'لطفاً در تمام کانال‌ها عضو شوید', show_alert: true });
      return;
    }

    const pool = getPool();
    const [userCheck] = await pool.query(
      'SELECT isBlocked FROM users WHERE userID = ? LIMIT 1',
      [userId]
    );

    if (userCheck && userCheck.length > 0) {
      const isBlocked = userCheck[0].isBlocked === 1 || userCheck[0].isBlocked === true;
      if (isBlocked) {
        await ctx.reply('❌ دسترسی شما متاسفانه مسدود میباشد');
        return;
      }
    }

    await saveOrUpdateUser(ctx.from);

    let startParam = ctx.startParam;
    
    if (!startParam && ctx.message?.text) {
      const parts = ctx.message.text.split(' ');
      if (parts.length > 1 && parts[0] === '/start') {
        startParam = parts[1];
      }
    }

    if (startParam) {
      await handleReferral(userId, startParam);
    }

    const welcomeMessage = `👋 به <b>ربات فیلترشکن ${config.BOT_NAME}</b> <b>خوش آمدید.</b>

در این ربات می‌توانید به‌صورت <b>سریع و مطمئن</b> <b>اشتراک</b> خود را تهیه یا تمدید کنید و در صورت نیاز با <b>پشتیبانی</b> در ارتباط باشید.

👇 <b>لطفاً</b> از <b>منوی زیر</b> گزینه مورد نظر خود را انتخاب نمایید `;

    const menuOpts = { parse_mode: 'HTML', ...(await getMainMenuAsync(userId)) };
    try {
      await ctx.editMessageText(welcomeMessage, menuOpts);
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        console.log('[verifyMembershipHandler] Message not modified');
      } else {
        console.error('[verifyMembershipHandler] Error editing message:', error);
        await ctx.reply(welcomeMessage, menuOpts);
      }
    }
  } catch (error) {
    console.error('[verifyMembershipHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در بررسی عضویت', show_alert: true });
  }
};

