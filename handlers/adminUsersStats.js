import { getPool } from '../services/database.js';
import { isAdmin } from '../services/admin.js';
import moment from 'moment-jalaali';

const getUsersStats = async () => {
  const pool = getPool();
  
  const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM users');
  const total = totalResult[0]?.count || 0;

  const [premiumResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE ispremium = 1');
  const premium = premiumResult[0]?.count || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE datejoined >= ?', [today]);
  const todayCount = todayResult[0]?.count || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  const [weekResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE datejoined >= ?', [weekAgo]);
  const weekCount = weekResult[0]?.count || 0;

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);

  const [monthResult] = await pool.query('SELECT COUNT(*) as count FROM users WHERE datejoined >= ?', [monthAgo]);
  const monthCount = monthResult[0]?.count || 0;

  return { total, premium, todayCount, weekCount, monthCount };
};

export default async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  
  if (!isAdmin(userId)) {
    await ctx.answerCbQuery({ text: 'شما دسترسی ندارید', show_alert: true });
    return;
  }

  try {
    const { total, premium, todayCount, weekCount, monthCount } = await getUsersStats();
    const now = moment().format('jYYYY/jMM/jDD ساعت HH:mm');

    const keyboard = [
      [
        { text: '👤 کل کاربران', callback_data: 'admin_users_total' },
        { text: '⭐️ کاربران پریمیوم', callback_data: 'admin_users_premium' }
      ],
      [
        { text: `${total}`, callback_data: 'admin_users_total_value' },
        { text: `${premium}`, callback_data: 'admin_users_premium_value' }
      ],
      [
        { text: '📆 آمار زمانی کاربران', callback_data: 'admin_users_time_stats' }
      ],
      [
        { text: '💚 امروز', callback_data: 'admin_users_today' },
        { text: '🤍 هفته', callback_data: 'admin_users_week' },
        { text: '❤️ ماه', callback_data: 'admin_users_month' }
      ],
      [
        { text: `${todayCount}`, callback_data: 'admin_users_today_value' },
        { text: `${weekCount}`, callback_data: 'admin_users_week_value' },
        { text: `${monthCount}`, callback_data: 'admin_users_month_value' }
      ],
      [
        { text: '🔄 بروزرسانی آمار', callback_data: 'admin_refresh_stats' }
      ],
      [
        { text: '🔙 بازگشت به منوی ادمین', callback_data: 'admin_panel' }
      ]
    ];

    const message = `📊 <b>آمار کاربران ربات</b>

شما می‌توانید آمار کاربران ربات را از این بخش مشاهده کنید.

🕰 آخرین بروزرسانی: ${now}`;

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
        try {
          await ctx.reply(message, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: keyboard
            }
          });
        } catch (replyError) {
          console.error('Error replying message:', replyError);
        }
      }
    }
  } catch (error) {
    console.error('Error in adminUsersStats:', error);
    await ctx.answerCbQuery({ text: 'خطا در دریافت آمار', show_alert: true });
  }
};

