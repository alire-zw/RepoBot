import { isAdmin } from '../services/admin.js';
import { setServerAddingState } from '../services/serverState.js';

const STEPS = [
  'serverName',
  'serverIP',
  'serverDomain',
  'port',
  'serverPath',
  'userName',
  'userPassword',
  'remark'
];

const STEP_LABELS = {
  serverName: 'نام نمایشی سرور',
  serverIP: 'آدرس IP سرور',
  serverDomain: 'دامنه (اختیاری - برای رد کردن «-» بفرستید)',
  port: 'پورت پنل (عدد)',
  serverPath: 'مسیر پنل (اختیاری - برای رد کردن «-» بفرستید)',
  userName: 'نام کاربری پنل',
  userPassword: 'رمز عبور پنل',
  remark: 'توضیحات (اختیاری - برای رد کردن «-» بفرستید)'
};

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    setServerAddingState(userId, {
      step: 'serverName',
      data: {},
      chatId: ctx.chat?.id,
      requestMessageId: ctx.callbackQuery?.message?.message_id
    });

    const message = `🖥️ <b>افزودن سرور جدید</b>

لطفاً <b>${STEP_LABELS.serverName}</b> را وارد کنید:

⚠️ برای لغو، روی دکمه بازگشت کلیک کنید.`;

    const keyboard = [
      [{ text: '🔙 بازگشت', callback_data: 'server_management' }]
    ];

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        return;
      }
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    console.error('[serverAddHandler] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در شروع افزودن سرور', show_alert: true });
  }
};

export { STEPS, STEP_LABELS };
