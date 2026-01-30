import { getPool } from './database.js';

/**
 * ایجاد رکورد تمدید (کیف پول با status=completed، کارت با status=pending)
 */
export const createRenewal = async (data) => {
  const pool = getPool();
  const {
    userID,
    subscriptionId,
    planId,
    amount,
    paymentMethod,
    status = 'pending',
    receiptImagePath = null
  } = data;
  const [result] = await pool.query(
    `INSERT INTO subscription_renewals (userID, subscriptionId, planId, amount, paymentMethod, status, receiptImagePath)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userID, subscriptionId, planId, amount, paymentMethod, status, receiptImagePath]
  );
  return { id: result.insertId, ...data };
};

/**
 * یافتن تمدید با ID
 */
export const findRenewalById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT r.*, p.name AS planName, p.volumeGB, p.durationDays, p.serverId, p.inboundId
     FROM subscription_renewals r
     LEFT JOIN plans p ON r.planId = p.id
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

/**
 * بروزرسانی تمدید
 */
export const updateRenewal = async (id, data) => {
  const pool = getPool();
  const allowed = ['status', 'approvedBy', 'rejectedBy', 'rejectReason'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`\`${key}\` = ?`);
      values.push(data[key]);
    }
  }
  if (fields.length === 0) return await findRenewalById(id);
  values.push(id);
  await pool.query(`UPDATE subscription_renewals SET ${fields.join(', ')} WHERE id = ?`, values);
  return await findRenewalById(id);
};
