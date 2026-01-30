import config from '../config/env.js';
import { getMainMenuAsync } from '../keyboards/main.js';
import { saveOrUpdateUser } from '../services/userService.js';
import { handleReferral } from '../services/referralService.js';
import { getPool } from '../services/database.js';
import { checkUserMembershipInAllChannels, getActiveChannels } from '../services/channelMembershipService.js';
import { getChannelMembershipKeyboard, getChannelMembershipMessage } from '../helpers/channelMembershipHelpers.js';

export default async (ctx) => {
  const userId = ctx.from.id;
  
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

  try {
    const activeChannels = await getActiveChannels();

    if (activeChannels.length > 0) {
      const membershipCheck = await checkUserMembershipInAllChannels(ctx.telegram, userId);

      if (!membershipCheck.allJoined && membershipCheck.missingChannels && membershipCheck.missingChannels.length > 0) {
        const keyboard = await getChannelMembershipKeyboard(ctx.telegram, userId);
        const message = getChannelMembershipMessage();

        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
        return;
      }
    }
  } catch (error) {
    console.error('[start] Error checking channel membership:', error);
  }

  const isNewUser = await saveOrUpdateUser(ctx.from);
  
  let startParam = ctx.startParam;
  
  if (!startParam && ctx.message?.text) {
    const parts = ctx.message.text.split(' ');
    if (parts.length > 1 && parts[0] === '/start') {
      startParam = parts[1];
    }
  }
  
  console.log(`Start handler: userID=${userId}, startParam=${startParam}, isNewUser=${isNewUser}`);
  
  if (startParam) {
    await handleReferral(userId, startParam);
  }
  
  const welcomeMessage = `👋 به <b>ربات فیلترشکن ${config.BOT_NAME}</b> <b>خوش آمدید.</b>

در این ربات می‌توانید به‌صورت <b>سریع و مطمئن</b> <b>اشتراک</b> خود را تهیه یا تمدید کنید و در صورت نیاز با <b>پشتیبانی</b> در ارتباط باشید.

👇 <b>لطفاً</b> از <b>منوی زیر</b> گزینه مورد نظر خود را انتخاب نمایید `;

  await ctx.reply(welcomeMessage, { parse_mode: 'HTML', ...(await getMainMenuAsync(userId)) });
};

