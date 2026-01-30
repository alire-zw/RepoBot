import config from '../config/env.js';
import { getMainMenuAsync } from '../keyboards/main.js';
import { saveOrUpdateUser } from '../services/userService.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  
  await saveOrUpdateUser(ctx.from);
  
  const welcomeMessage = `👋 به <b>ربات فیلترشکن ${config.BOT_NAME}</b> <b>خوش آمدید.</b>

در این ربات می‌توانید به‌صورت <b>سریع و مطمئن</b> <b>اشتراک</b> خود را تهیه یا تمدید کنید و در صورت نیاز با <b>پشتیبانی</b> در ارتباط باشید.

👇 <b>لطفاً</b> از <b>منوی زیر</b> گزینه مورد نظر خود را انتخاب نمایید `;

  const menuOpts = { parse_mode: 'HTML', ...(await getMainMenuAsync(userId)) };
  try {
    await ctx.editMessageText(welcomeMessage, menuOpts);
  } catch {
    await ctx.reply(welcomeMessage, menuOpts);
  }
};

