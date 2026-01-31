import { isAdmin } from '../services/admin.js';
import { findServerByDatabaseID } from '../services/serverService.js';
import { setServerEditState } from '../services/serverState.js';

const FIELD_LABELS = {
  serverName: 'نام سرور',
  serverIP: 'آدرس IP سرور',
  serverDomain: 'دامنه',
  port: 'پورت پنل',
  serverPath: 'مسیر پنل (Path)',
  remark: 'Remark سرور (ابتدای نام اشتراک‌ها)'
};

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  const data = ctx.callbackQuery?.data;
  const match = data && data.match(/^server_edit_(.+)_(\d+)$/);
  if (!match) return;

  const field = match[1];
  const serverId = parseInt(match[2], 10);
  const allowed = ['serverName', 'serverIP', 'serverDomain', 'port', 'serverPath', 'remark'];
  if (!allowed.includes(field)) return;

  const server = await findServerByDatabaseID(serverId);
  if (!server) {
    await ctx.answerCbQuery({ text: 'سرور یافت نشد', show_alert: true });
    return;
  }

  const label = FIELD_LABELS[field] || field;
  const current = server[field] != null && server[field] !== '' ? String(server[field]) : '(خالی)';
  setServerEditState(userId, {
    serverId,
    field,
    chatId: ctx.chat?.id,
    requestMessageId: ctx.callbackQuery?.message?.message_id
  });

  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hint = field === 'port' ? ' (عدد ۱ تا ۶۵۵۳۵)' : '';
  const message = `✏️ <b>ویرایش ${label}</b>

مقدار فعلی: <code>${escapeHtml(current)}</code>

مقدار جدید را وارد کنید:${hint}`;

  const keyboard = {
    inline_keyboard: [[{ text: '🔙 انصراف', callback_data: `server_detail_${serverId}` }]]
  };

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } catch (e) {
    if (!e.description?.includes('message is not modified')) {
      await ctx.reply(message, { parse_mode: 'HTML', reply_markup: keyboard });
    }
  }
};
