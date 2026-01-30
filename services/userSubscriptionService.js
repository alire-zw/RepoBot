import { getPool } from './database.js';

/**
 * ذخیرهٔ اطلاعات کامل اشتراک تحویل‌شده (پس از خرید با کیف‌پول یا تایید کارت‌به‌کارت)
 */
export const createUserSubscription = async (data) => {
  const pool = getPool();
  const {
    userID,
    planId,
    inboundId,
    planName,
    serverId,
    serverName,
    volumeGB,
    durationDays,
    connectionLink,
    clientEmail,
    expiryTime,
    paymentMethod,
    planOrderId = null
  } = data;
  await pool.query(
    `INSERT INTO user_subscriptions (
      userID, planId, inboundId, planName, serverId, serverName,
      volumeGB, durationDays, connectionLink, clientEmail, expiryTime,
      paymentMethod, planOrderId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userID,
      planId,
      inboundId ?? null,
      planName ?? '',
      serverId,
      serverName ?? '',
      volumeGB ?? 0,
      durationDays ?? 0,
      connectionLink ?? null,
      clientEmail ?? '',
      expiryTime ?? null,
      paymentMethod,
      planOrderId
    ]
  );
};

export const getSubscriptionById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM user_subscriptions WHERE id = ? LIMIT 1',
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const updateSubscriptionConnectionLink = async (id, connectionLink) => {
  const pool = getPool();
  await pool.query(
    'UPDATE user_subscriptions SET connectionLink = ? WHERE id = ?',
    [connectionLink, id]
  );
};

/**
 * لیست اشتراک‌های تحویل‌شدهٔ یک کاربر (برای بخش «کانفیگ های من»)
 */
export const getUserSubscriptions = async (userID) => {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM user_subscriptions
     WHERE userID = ?
     ORDER BY createdAt DESC`,
    [userID]
  );
  return rows;
};
