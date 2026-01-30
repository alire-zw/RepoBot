/**
 * کمک برای حذف پیام و سپس ارسال پیام جدید (برای جلوگیری از خطای ادیت پیام قدیمی)
 */
export async function ctxDeleteThenReply(ctx, sendReply) {
  const msg = ctx.callbackQuery?.message;
  if (msg?.chat?.id != null && msg?.message_id != null) {
    try {
      await ctx.telegram.deleteMessage(msg.chat.id, msg.message_id);
    } catch (_) {}
  }
  await sendReply();
}
