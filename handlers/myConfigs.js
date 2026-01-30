import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const message = 'در حال توسعه می‌باشد';
  try {
    await ctx.editMessageText(message, backButton);
  } catch {
    await ctx.reply(message, backButton);
  }
};

