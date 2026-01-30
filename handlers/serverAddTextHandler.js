import { getServerAddingState, setServerAddingState, clearServerAddingState } from '../services/serverState.js';
import { createServer, loginAndGetSessionCookie } from '../services/serverService.js';
import { STEPS, STEP_LABELS } from './serverAddHandler.js';

const OPTIONAL_STEPS = ['serverDomain', 'serverPath', 'remark'];
const SKIP_VALUES = ['-', 'ندار', 'خالی', ''];

function isSkipValue(text) {
  if (!text || typeof text !== 'string') return true;
  const t = text.trim().toLowerCase();
  return SKIP_VALUES.includes(t) || t === '';
}

/**
 * بروزرسانی پیام در چت (سعی در edit، در صورت خطا reply)
 */
async function updateAddServerMessage(ctx, chatId, messageId, text, keyboard) {
  try {
    if (chatId && messageId) {
      await ctx.telegram.editMessageText(chatId, messageId, null, text, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: keyboard }
      });
      return true;
    }
  } catch (e) {
    if (e.description && e.description.includes('message is not modified')) return true;
  }
  return false;
}

/**
 * هندلر متن برای مراحل افزودن سرور. اگر کاربر در حالت افزودن سرور باشد، true برمی‌گرداند.
 */
export default async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return false;

  const state = getServerAddingState(userId);
  if (!state || !state.step) return false;

  const text = (ctx.message?.text || '').trim();
  const step = state.step;
  const data = state.data || {};
  const chatId = state.chatId || ctx.chat?.id;
  const requestMessageId = state.requestMessageId;

  // حذف پیام ادمین تا در چت نماند
  try {
    if (ctx.message?.message_id != null && ctx.chat?.id != null) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
    }
  } catch (e) {
    // نادیده بگیر؛ ممکن است پیام قبلاً حذف شده یا ربات اجازه حذف نداشته باشد
  }

  const keyboard = [[{ text: '🔙 بازگشت', callback_data: 'server_management' }]];

  // اعتبارسنجی
  if (step === 'port') {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1 || num > 65535) {
      const msg = `❌ پورت باید یک عدد بین ۱ تا ۶۵۵۳۵ باشد.\n\nلطفاً دوباره وارد کنید:`;
      await ctx.reply(msg);
      return true;
    }
    data.port = num;
  } else if (OPTIONAL_STEPS.includes(step)) {
    if (isSkipValue(text)) {
      data[step] = null;
    } else {
      data[step] = text;
    }
  } else {
    if (!text) {
      await ctx.reply('❌ مقدار خالی مجاز نیست. لطفاً دوباره وارد کنید.');
      return true;
    }
    data[step] = text;
  }

  const currentIndex = STEPS.indexOf(step);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= STEPS.length) {
    // آخرین مرحله: اول لاگین و دریافت کوکی، بعد در صورت موفقیت ذخیره
    clearServerAddingState(userId);
    const waitMsg = `⏳ در حال اتصال به پنل و دریافت کوکی‌ها...`;
    const okWait = await updateAddServerMessage(ctx, chatId, requestMessageId, waitMsg, keyboard);
    if (!okWait) await ctx.reply(waitMsg);

    const loginResult = await loginAndGetSessionCookie({
      serverName: data.serverName,
      serverIP: data.serverIP,
      serverDomain: data.serverDomain || null,
      port: data.port,
      serverPath: data.serverPath || null,
      userName: data.userName,
      userPassword: data.userPassword
    });

    if (!loginResult.success) {
      const errMsg = `❌ سرور اضافه نشد.\n\n<b>علت:</b> ${loginResult.error}\n\nلطفاً اطلاعات (آدرس، پورت، نام کاربری و رمز) را بررسی کنید و دوباره از منوی «افزودن سرور» شروع کنید.`;
      await updateAddServerMessage(ctx, chatId, requestMessageId, errMsg, [
        [{ text: '🔙 بازگشت به مدیریت سرورها', callback_data: 'server_management' }]
      ]).catch(() => ctx.reply(errMsg, { parse_mode: 'HTML' }));
      return true;
    }

    try {
      await createServer({
        serverName: data.serverName,
        serverIP: data.serverIP,
        serverDomain: data.serverDomain || null,
        port: data.port,
        serverPath: data.serverPath || null,
        userName: data.userName,
        userPassword: data.userPassword,
        remark: data.remark || null,
        sessionCookie: loginResult.sessionCookie,
        sessionCookieUpdatedAt: loginResult.sessionCookieUpdatedAt,
        isActive: true
      });
      const successMsg = `✅ سرور <b>${data.serverName}</b> با موفقیت اضافه شد.`;
      const ok = await updateAddServerMessage(ctx, chatId, requestMessageId, successMsg, [
        [{ text: '🔙 بازگشت به مدیریت سرورها', callback_data: 'server_management' }]
      ]);
      if (!ok) await ctx.reply(successMsg, { parse_mode: 'HTML' });
    } catch (err) {
      console.error('[serverAddTextHandler] createServer error:', err);
      await ctx.reply('❌ خطا در ذخیره سرور. لطفاً دوباره تلاش کنید.');
    }
    return true;
  }

  const nextStep = STEPS[nextIndex];
  setServerAddingState(userId, { ...state, step: nextStep, data });

  const nextLabel = STEP_LABELS[nextStep];
  const message = `🖥️ <b>افزودن سرور</b>\n\nلطفاً <b>${nextLabel}</b> را وارد کنید:`;

  const ok = await updateAddServerMessage(ctx, chatId, requestMessageId, message, keyboard);
  if (!ok) await ctx.reply(message, { parse_mode: 'HTML', reply_markup: { inline_keyboard: keyboard } });
  return true;
}
