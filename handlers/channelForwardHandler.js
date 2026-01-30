import { getPool } from '../services/database.js';
import { findChannelByID } from '../services/channelService.js';
import { isAdmin } from '../services/admin.js';
import { getChannelAddingState, setChannelAddingState, clearChannelAddingState } from '../services/channelState.js';

export default async (ctx) => {
  const userId = ctx.from?.id;

  console.log('[channelForwardHandler] Called with userId:', userId);
  console.log('[channelForwardHandler] Message:', {
    hasMessage: !!ctx.message,
    hasForward: !!ctx.message?.forward_from_chat,
    forwardType: ctx.message?.forward_from_chat?.type,
    forwardId: ctx.message?.forward_from_chat?.id
  });

  if (!userId) {
    console.log('[channelForwardHandler] No userId found');
    return false;
  }

  if (!isAdmin(userId)) {
    console.log('[channelForwardHandler] User is not admin');
    return false;
  }

  const state = getChannelAddingState(userId);
  console.log('[channelForwardHandler] State:', state);
  
  if (!state || state.state !== 'waiting_forward') {
    console.log('[channelForwardHandler] No valid state or not waiting for forward');
    return false;
  }

  // بررسی اینکه پیام forward شده است
  const forwardFrom = ctx.message?.forward_from_chat;
  if (!forwardFrom) {
    console.log('[channelForwardHandler] No forward_from_chat found');
    return false;
  }

  // بررسی اینکه از کانال است (نه گروه یا چت خصوصی)
  if (forwardFrom.type !== 'channel') {
    console.log('[channelForwardHandler] Forward is not from channel, type:', forwardFrom.type);
    try {
      await ctx.deleteMessage();
      await ctx.reply('❌ این پیام از یک کانال نیست. لطفاً یک پیام از کانال را forward کنید.');
    } catch (error) {
      console.error('[channelForwardHandler] Error:', error);
    }
    return true;
  }

  console.log('[channelForwardHandler] Processing channel forward:', {
    channelID: forwardFrom.id,
    channelName: forwardFrom.title,
    channelUsername: forwardFrom.username
  });

  try {
    const channelID = forwardFrom.id;
    const channelName = forwardFrom.title || 'بدون نام';
    const channelUsername = forwardFrom.username || null;

    // بررسی اینکه آیا کانال در دیتابیس وجود دارد
    const existingChannel = await findChannelByID(channelID);

    // اگر در دیتابیس نبود، مستقیماً آن را ذخیره می‌کنیم
    if (!existingChannel) {
      // حذف پیام forward شده
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[channelForwardHandler] Could not delete forwarded message:', error.message);
      }

      // دریافت اطلاعات بیشتر از Telegram
      let memberCount = 0;
      let inviteLink = null;

      try {
        memberCount = await ctx.telegram.getChatMembersCount(channelID);
      } catch (error) {
        console.log('[channelForwardHandler] Could not get member count:', error.message);
      }

      try {
        // تلاش برای ساخت invite link
        const botInfo = await ctx.telegram.getMe();
        if (botInfo && botInfo.id) {
          const chatMember = await ctx.telegram.getChatMember(channelID, botInfo.id);
          if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
            try {
              const exportedLink = await ctx.telegram.exportChatInviteLink(channelID);
              inviteLink = exportedLink;
            } catch (error) {
              console.log('[channelForwardHandler] Could not export invite link:', error.message);
            }
          }
        }
      } catch (error) {
        console.log('[channelForwardHandler] Could not get chat member:', error.message);
      }

      // ذخیره کانال در دیتابیس
      const pool = getPool();
      try {
        await pool.query(
          `INSERT INTO channels (channelID, channelName, channelUsername, buttonLabel, inviteLink, isLocked, memberCount) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            channelID,
            channelName,
            channelUsername,
            'تایید عضویت',
            inviteLink,
            0, // isLocked = false
            memberCount
          ]
        );

        // نمایش پیام موفقیت
        const username = channelUsername ? `@${channelUsername}` : 'ندارد';
        const message = `✅ <b>کانال با موفقیت اضافه شد</b>

<b>نام:</b> ${channelName}
<b>یوزرنیم:</b> ${username}
<b>آیدی:</b> <code>${channelID}</code>
<b>تعداد اعضا:</b> ${memberCount.toLocaleString('en-US')}`;

        const keyboard = [
          [
            { text: '➕ افزودن کانال دیگر', callback_data: 'channel_add' },
            { text: '📋 مشاهده کانال‌ها', callback_data: 'channel_list' }
          ],
          [
            { text: '🔙 بازگشت', callback_data: 'channel_management' }
          ]
        ];

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            message,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: keyboard
              }
            }
          );
        } catch (error) {
          console.error('[channelForwardHandler] Error editing message:', error);
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        }

        // پاک کردن state چون کار تمام شده
        clearChannelAddingState(userId);
      } catch (dbError) {
        console.error('[channelForwardHandler] Database error:', dbError);
        const errorMessage = `❌ <b>خطا در ذخیره کانال</b>

خطا در ذخیره کانال در دیتابیس. لطفاً دوباره تلاش کنید.`;

        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            state.requestMessageId,
            null,
            errorMessage,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '➕ افزودن کانال دیگر', callback_data: 'channel_add' },
                    { text: '🔙 بازگشت', callback_data: 'channel_management' }
                  ]
                ]
              }
            }
          );
        } catch (error) {
          console.error('[channelForwardHandler] Error editing error message:', error);
          await ctx.reply(errorMessage, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '➕ افزودن کانال دیگر', callback_data: 'channel_add' },
                  { text: '🔙 بازگشت', callback_data: 'channel_management' }
                ]
              ]
            }
          });
        }
      }
    } else {
      // کانال قبلاً در دیتابیس وجود دارد
      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[channelForwardHandler] Could not delete forwarded message:', error.message);
      }

      const username = existingChannel.channelUsername ? `@${existingChannel.channelUsername}` : 'ندارد';
      const message = `⚠️ <b>کانال از قبل موجود است</b>\n\n<b>نام:</b> ${existingChannel.channelName}\n<b>یوزرنیم:</b> ${username}\n<b>آیدی:</b> <code>${existingChannel.channelID}</code>`;

      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          state.requestMessageId,
          null,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'channel_management' }
                ]
              ]
            }
          }
        );
      } catch (error) {
        console.error('[channelForwardHandler] Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🔙 بازگشت', callback_data: 'channel_management' }
              ]
            ]
          }
        });
      }
    }

    return true;
  } catch (error) {
    console.error('[channelForwardHandler] Error:', error);
    try {
      if (ctx.message && ctx.message.message_id) {
        await ctx.deleteMessage().catch(err => {
          console.log('[channelForwardHandler] Could not delete message in error handler:', err.message);
        });
      }
      await ctx.reply('❌ خطا در پردازش کانال. لطفاً دوباره تلاش کنید.');
    } catch (err) {
      console.error('[channelForwardHandler] Error sending error message:', err);
    }
    return true;
  }
};

