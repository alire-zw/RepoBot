import { getPool } from '../services/database.js';
import { getUserBalance } from '../services/walletService.js';
import { updateUserBalance } from '../services/walletService.js';
import { isAdmin } from '../services/admin.js';
import { getBalanceState, setBalanceState, clearBalanceState } from './adminBalanceManagement.js';

export default async (ctx) => {
  const userId = ctx.from.id;

  if (!isAdmin(userId)) {
    return false;
  }

  const text = ctx.message?.text;
  if (!text) {
    return false;
  }

  const state = getBalanceState(userId);
  if (!state) {
    return false;
  }

  try {
    const pool = getPool();

    if (state.state === 'waiting_user_id') {
      const userID = parseInt(text.trim(), 10);
      
      if (isNaN(userID)) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                ]
              ]
            }
          });
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const [user] = await pool.query(
        'SELECT userID, name, username, balance FROM users WHERE userID = ? LIMIT 1',
        [userID]
      );

      if (!user || user.length === 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>کاربر یافت نشد</b>

کاربری با آیدی <code>${userID}</code> یافت نشد.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const userData = user[0];
      const balance = await getUserBalance(userID);
      const formattedBalance = balance.toLocaleString('en-US');
      const username = userData.username ? `@${userData.username}` : 'ندارد';

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const message = `👤 <b>اطلاعات کاربر</b>

<b>آیدی:</b> <code>${userID}</code>
<b>نام:</b> ${userData.name}
<b>یوزرنیم:</b> ${username}
<b>موجودی فعلی:</b> ${formattedBalance} تومان

لطفاً موجودی جدید را به تومان وارد کنید:`;

      const requestMessageId = state.requestMessageId;
      
      setBalanceState(userId, {
        state: 'waiting_new_balance',
        step: 'new_balance',
        targetUserID: userID,
        targetUserName: userData.name,
        requestMessageId: requestMessageId
      });

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error editing message:', error);
      }

    } else if (state.state === 'waiting_user_id_decrease') {
      const userID = parseInt(text.trim(), 10);
      
      if (isNaN(userID)) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const [user] = await pool.query(
        'SELECT userID, name, username, balance FROM users WHERE userID = ? LIMIT 1',
        [userID]
      );

      if (!user || user.length === 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>کاربر یافت نشد</b>

کاربری با آیدی <code>${userID}</code> یافت نشد.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const userData = user[0];
      const balance = await getUserBalance(userID);
      const formattedBalance = balance.toLocaleString('en-US');
      const username = userData.username ? `@${userData.username}` : 'ندارد';

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const message = `👤 <b>اطلاعات کاربر</b>

<b>آیدی:</b> <code>${userID}</code>
<b>نام:</b> ${userData.name}
<b>یوزرنیم:</b> ${username}
<b>موجودی فعلی:</b> ${formattedBalance} تومان

لطفاً مبلغ کاهش را به تومان وارد کنید:`;

      const requestMessageId = state.requestMessageId;
      
      setBalanceState(userId, {
        state: 'waiting_decrease_amount',
        step: 'decrease_amount',
        targetUserID: userID,
        targetUserName: userData.name,
        requestMessageId: requestMessageId
      });

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error editing message:', error);
      }

      return true;

    } else if (state.state === 'waiting_decrease_amount') {
      const cleanAmount = text.replace(/[,،\s]/g, '');
      const decreaseAmount = parseInt(cleanAmount, 10);

      if (isNaN(decreaseAmount) || decreaseAmount <= 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>مبلغ نامعتبر</b>

مبلغ وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

موجودی فعلی کاربر: ${(await getUserBalance(state.targetUserID)).toLocaleString('en-US')} تومان

لطفاً مبلغ کاهش را به تومان وارد کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const oldBalance = await getUserBalance(state.targetUserID);
      const newBalance = Math.max(0, oldBalance - decreaseAmount);

      await pool.query(
        'UPDATE users SET balance = ? WHERE userID = ?',
        [newBalance, state.targetUserID]
      );

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const formattedOldBalance = oldBalance.toLocaleString('en-US');
      const formattedNewBalance = newBalance.toLocaleString('en-US');
      const formattedDecreaseAmount = decreaseAmount.toLocaleString('en-US');

      const message = `✅ <b>موجودی کاربر کاهش یافت</b>

<b>کاربر:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>

<b>موجودی قبلی:</b> ${formattedOldBalance} تومان
<b>مبلغ کاهش:</b> ${formattedDecreaseAmount} تومان
<b>موجودی جدید:</b> ${formattedNewBalance} تومان`;

      const requestMessageId = state.requestMessageId;
      clearBalanceState(userId);

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                    ],
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                ],
                [
                  { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error sending message:', error);
      }

      return true;

    } else if (state.state === 'waiting_user_id_decrease') {
      const userID = parseInt(text.trim(), 10);
      
      if (isNaN(userID)) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>آیدی نامعتبر</b>

آیدی وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const [user] = await pool.query(
        'SELECT userID, name, username, balance FROM users WHERE userID = ? LIMIT 1',
        [userID]
      );

      if (!user || user.length === 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>کاربر یافت نشد</b>

کاربری با آیدی <code>${userID}</code> یافت نشد.

لطفاً آیدی عددی کاربر را ارسال کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const userData = user[0];
      const balance = await getUserBalance(userID);
      const formattedBalance = balance.toLocaleString('en-US');
      const username = userData.username ? `@${userData.username}` : 'ندارد';

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const message = `👤 <b>اطلاعات کاربر</b>

<b>آیدی:</b> <code>${userID}</code>
<b>نام:</b> ${userData.name}
<b>یوزرنیم:</b> ${username}
<b>موجودی فعلی:</b> ${formattedBalance} تومان

لطفاً مبلغ کاهش را به تومان وارد کنید:`;

      const requestMessageId = state.requestMessageId;
      
      setBalanceState(userId, {
        state: 'waiting_decrease_amount',
        step: 'decrease_amount',
        targetUserID: userID,
        targetUserName: userData.name,
        requestMessageId: requestMessageId
      });

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error editing message:', error);
      }

      return true;

    } else if (state.state === 'waiting_decrease_amount') {
      const cleanAmount = text.replace(/[,،\s]/g, '');
      const decreaseAmount = parseInt(cleanAmount, 10);

      if (isNaN(decreaseAmount) || decreaseAmount <= 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>مبلغ نامعتبر</b>

مبلغ وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

موجودی فعلی کاربر: ${(await getUserBalance(state.targetUserID)).toLocaleString('en-US')} تومان

لطفاً مبلغ کاهش را به تومان وارد کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const oldBalance = await getUserBalance(state.targetUserID);
      const newBalance = Math.max(0, oldBalance - decreaseAmount);

      await pool.query(
        'UPDATE users SET balance = ? WHERE userID = ?',
        [newBalance, state.targetUserID]
      );

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const formattedOldBalance = oldBalance.toLocaleString('en-US');
      const formattedNewBalance = newBalance.toLocaleString('en-US');
      const formattedDecreaseAmount = decreaseAmount.toLocaleString('en-US');

      const message = `✅ <b>موجودی کاربر کاهش یافت</b>

<b>کاربر:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>

<b>موجودی قبلی:</b> ${formattedOldBalance} تومان
<b>مبلغ کاهش:</b> ${formattedDecreaseAmount} تومان
<b>موجودی جدید:</b> ${formattedNewBalance} تومان`;

      const requestMessageId = state.requestMessageId;
      clearBalanceState(userId);

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                    ],
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_decrease' }
                ],
                [
                  { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error sending message:', error);
      }

      return true;

    } else if (state.state === 'waiting_increase_amount') {
      const cleanAmount = text.replace(/[,،\s]/g, '');
      const increaseAmount = parseInt(cleanAmount, 10);

      if (isNaN(increaseAmount) || increaseAmount <= 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>مبلغ نامعتبر</b>

مبلغ وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

موجودی فعلی کاربر: ${(await getUserBalance(state.targetUserID)).toLocaleString('en-US')} تومان

لطفاً مبلغ افزایش را به تومان وارد کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const oldBalance = await getUserBalance(state.targetUserID);
      const newBalance = oldBalance + increaseAmount;

      await pool.query(
        'UPDATE users SET balance = ? WHERE userID = ?',
        [newBalance, state.targetUserID]
      );

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const formattedOldBalance = oldBalance.toLocaleString('en-US');
      const formattedNewBalance = newBalance.toLocaleString('en-US');
      const formattedIncreaseAmount = increaseAmount.toLocaleString('en-US');

      const message = `✅ <b>موجودی کاربر افزایش یافت</b>

<b>کاربر:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>

<b>موجودی قبلی:</b> ${formattedOldBalance} تومان
<b>مبلغ افزایش:</b> ${formattedIncreaseAmount} تومان
<b>موجودی جدید:</b> ${formattedNewBalance} تومان`;

      const requestMessageId = state.requestMessageId;
      clearBalanceState(userId);

      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔄 ویرایش مجدد', callback_data: `admin_balance_edit_${state.targetUserID}` }
                    ],
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 ویرایش مجدد', callback_data: `admin_balance_edit_${state.targetUserID}` }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 ویرایش مجدد', callback_data: `admin_balance_edit_${state.targetUserID}` }
                ],
                [
                  { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error sending message:', error);
      }

      return true;

    } else if (state.state === 'waiting_new_balance') {
      const cleanBalance = text.replace(/[,،\s]/g, '');
      const newBalance = parseInt(cleanBalance, 10);

      if (isNaN(newBalance) || newBalance < 0) {
        try {
          await ctx.deleteMessage();
        } catch (error) {
          console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
        }

        const requestMessageId = state.requestMessageId;
        const message = `❌ <b>مبلغ نامعتبر</b>

مبلغ وارد شده معتبر نیست. لطفاً یک عدد معتبر وارد کنید.

موجودی فعلی کاربر: ${(await getUserBalance(state.targetUserID)).toLocaleString('en-US')} تومان

لطفاً موجودی جدید را به تومان وارد کنید:`;

        try {
          if (requestMessageId) {
            try {
              await ctx.telegram.editMessageText(
                ctx.chat.id,
                requestMessageId,
                null,
                message,
                {
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                      ]
                    ]
                  }
                }
              );
            } catch (editError) {
              console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
              await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              });
            }
          } else {
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔙 بازگشت', callback_data: 'admin_balance_management' }
                  ]
                ]
              }
            });
          }
        } catch (error) {
          console.error('[adminBalanceHandler] Error sending message:', error);
        }
        return true;
      }

      const oldBalance = await getUserBalance(state.targetUserID);
      const difference = newBalance - oldBalance;

      await pool.query(
        'UPDATE users SET balance = ? WHERE userID = ?',
        [newBalance, state.targetUserID]
      );

      try {
        await ctx.deleteMessage();
      } catch (error) {
        console.log('[adminBalanceHandler] Could not delete admin message:', error.message);
      }

      const formattedOldBalance = oldBalance.toLocaleString('en-US');
      const formattedNewBalance = newBalance.toLocaleString('en-US');
      const formattedDifference = Math.abs(difference).toLocaleString('en-US');
      const changeType = difference > 0 ? 'افزایش' : difference < 0 ? 'کاهش' : 'بدون تغییر';

      const message = `✅ <b>موجودی کاربر بروزرسانی شد</b>

<b>کاربر:</b> ${state.targetUserName}
<b>آیدی:</b> <code>${state.targetUserID}</code>

<b>موجودی قبلی:</b> ${formattedOldBalance} تومان
<b>موجودی جدید:</b> ${formattedNewBalance} تومان
<b>تغییر:</b> ${changeType === 'بدون تغییر' ? 'بدون تغییر' : `${changeType} ${formattedDifference} تومان`}`;

      const requestMessageId = state.requestMessageId;
      clearBalanceState(userId);
      try {
        if (requestMessageId) {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              requestMessageId,
              null,
              message,
              {
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_edit' }
                    ],
                    [
                      { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                    ]
                  ]
                }
              }
            );
          } catch (editError) {
            console.log('[adminBalanceHandler] Could not edit message, sending new:', editError.message);
            await ctx.reply(message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_edit' }
                  ],
                  [
                    { text: '🔙 بازگشت به پنل ادمین', callback_data: 'admin_panel' }
                  ]
                ]
              }
            });
          }
        } else {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '🔄 ویرایش مجدد', callback_data: 'admin_balance_edit' }
                ],
                [
                  { text: '🔙 بازگشت به منوی مدیریت موجودی', callback_data: 'admin_balance_management' }
                ]
              ]
            }
          });
        }
      } catch (error) {
        console.error('[adminBalanceHandler] Error sending message:', error);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('[adminBalanceHandler] Error:', error);
    await ctx.reply('❌ خطا در پردازش درخواست. لطفاً دوباره تلاش کنید.');
    clearBalanceState(userId);
    return true;
  }

  return false;
};

