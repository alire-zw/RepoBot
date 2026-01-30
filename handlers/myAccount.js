import { getPool } from '../services/database.js';
import { getUserBalance } from '../services/walletService.js';
import { backButton } from '../keyboards/main.js';

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  try {
    const pool = getPool();
    const [user] = await pool.query(
      'SELECT * FROM users WHERE userID = ? LIMIT 1',
      [userId]
    );

    if (!user || user.length === 0) {
      await ctx.editMessageText('❌ کاربر یافت نشد', backButton);
      return;
    }

    const userData = user[0];
    const balance = await getUserBalance(userId);
    const formattedBalance = balance.toLocaleString('en-US');
    const refcode = userData.refcode || 'ندارد';
    const botInfo = await ctx.telegram.getMe();
    const botUsername = botInfo.username;
    const referralLink = `https://t.me/${botUsername}?start=${refcode}`;

           const message = `👤 <b>حساب کاربری من</b> | آیدی: <code>${userId}</code>

در این بخش می‌توانید موجودی حساب خود را مشاهده کرده و با دعوت دوستان، اعتبار هدیه دریافت نمایید.
دعوت هر کاربر جدید، موجودی شما را افزایش خواهد داد.

💰 <b>موجودی شما:</b> ${formattedBalance} تومان

🔗 <b>لینک دعوت شما:</b>
<code>${referralLink}</code>`;

    const keyboard = [
      [
        { text: '💵 افزایش موجودی', callback_data: 'charge_wallet' },
        { text: '💸 انتقال موجودی', callback_data: 'transfer_wallet' }
      ],
      [
        { text: '🔙 بازگشت به منوی اصلی', callback_data: 'back_to_main' }
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
        console.log('Message not modified, content is the same');
      } else {
        console.error('Error editing message:', error);
        await ctx.reply(message, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      }
    }
  } catch (error) {
    console.error('Error in myAccount:', error);
    await ctx.answerCbQuery({ text: 'خطا در دریافت اطلاعات', show_alert: true });
  }
};
