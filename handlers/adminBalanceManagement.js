import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';
import { getState, setState, deleteState } from '../services/stateManager.js';

const BALANCE_PREFIX = 'admin_balance_';

const getBalanceStateKey = (adminID) => `${BALANCE_PREFIX}${adminID}`;

export const getBalanceState = (adminID) => {
  return getState(getBalanceStateKey(adminID));
};

export const setBalanceState = (adminID, state) => {
  setState(getBalanceStateKey(adminID), state);
};

export const clearBalanceState = (adminID) => {
  deleteState(getBalanceStateKey(adminID));
};

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const pool = getPool();

  try {
    const message = `💰 <b>مدیریت موجودی کاربران</b>

شما می‌توانید موجودی کاربران را مشاهده و ویرایش کنید.`;

    const keyboard = [
      [
        { text: '🔍 جستجوی کاربر', callback_data: 'admin_balance_search' },
        { text: '✏️ ویرایش موجودی', callback_data: 'admin_balance_edit' }
      ],
      [
        { text: '🔙 بازگشت به منوی ادمین', callback_data: 'admin_panel' }
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
        console.log('[adminBalanceManagement] Message not modified, content is the same');
      } else {
        console.error('[adminBalanceManagement] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('[adminBalanceManagement] Error:', error);
    await ctx.answerCbQuery({ text: 'خطا در نمایش منوی مدیریت موجودی', show_alert: true });
  }
};

