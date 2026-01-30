import { getPool } from './database.js';

/**
 * ایجاد سفارش پلن (پرداخت کارت به کارت - در انتظار رسید)
 */
export const createPlanOrder = async (data) => {
  try {
    const pool = getPool();
    const { userID, planId, amount, paymentMethod, status = 'pending' } = data;
    const [result] = await pool.query(
      `INSERT INTO plan_orders (userID, planId, amount, paymentMethod, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userID, planId, amount, paymentMethod, status]
    );
    return { id: result.insertId, ...data };
  } catch (error) {
    console.error('Error createPlanOrder:', error);
    throw error;
  }
};

/**
 * یافتن سفارش با ID
 */
export const findPlanOrderById = async (id) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, p.name AS planName, p.volumeGB, p.durationDays, p.serverId, p.inboundId, p.inboundTag
       FROM plan_orders o
       LEFT JOIN plans p ON o.planId = p.id
       WHERE o.id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error findPlanOrderById:', error);
    throw error;
  }
};

/**
 * بروزرسانی وضعیت و رسید سفارش
 */
export const updatePlanOrder = async (id, data) => {
  try {
    const pool = getPool();
    const allowed = ['status', 'receiptImagePath', 'approvedBy', 'rejectedBy', 'rejectReason', 'clientConfig'];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        values.push(data[key]);
      }
    }
    if (fields.length === 0) return await findPlanOrderById(id);
    values.push(id);
    await pool.query(`UPDATE plan_orders SET ${fields.join(', ')} WHERE id = ?`, values);
    return await findPlanOrderById(id);
  } catch (error) {
    console.error('Error updatePlanOrder:', error);
    throw error;
  }
};

/**
 * سفارش‌های در انتظار تایید (برای ادمین)
 */
export const getPendingPlanOrders = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT o.*, p.name AS planName, p.priceToman, p.volumeGB, p.durationDays
       FROM plan_orders o
       LEFT JOIN plans p ON o.planId = p.id
       WHERE o.paymentMethod = 'card' AND o.status = 'pending'
       ORDER BY o.createdAt DESC`
    );
    return rows;
  } catch (error) {
    console.error('Error getPendingPlanOrders:', error);
    throw error;
  }
};
