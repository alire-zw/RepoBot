import { getPool } from './database.js';

const KEY_PAYMENT_METHOD = 'payment_method';
const KEY_PV_USERNAME = 'pv_username';
const KEY_SUPPORT_LINK = 'support_link';
const METHOD_CARD = 'card';
const METHOD_PVID = 'pvid';

/** @returns {'card'|'pvid'|null} */
export async function getPaymentMethod() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT `value` FROM bot_settings WHERE `key` = ? LIMIT 1',
    [KEY_PAYMENT_METHOD]
  );
  const v = rows[0]?.value;
  if (v === METHOD_CARD || v === METHOD_PVID) return v;
  return null;
}

/** @param {'card'|'pvid'} method */
export async function setPaymentMethod(method) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO bot_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [KEY_PAYMENT_METHOD, method]
  );
}

/** @returns {string} */
export async function getPvUsername() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT `value` FROM bot_settings WHERE `key` = ? LIMIT 1',
    [KEY_PV_USERNAME]
  );
  return (rows[0]?.value || '').trim();
}

/** @param {string} username */
export async function setPvUsername(username) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO bot_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [KEY_PV_USERNAME, (username || '').trim()]
  );
}

/** @returns {Promise<string>} لینک پشتیبانی از تنظیمات ربات (خالی اگر تنظیم نشده) */
export async function getSupportLink() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT `value` FROM bot_settings WHERE `key` = ? LIMIT 1',
    [KEY_SUPPORT_LINK]
  );
  return (rows[0]?.value || '').trim();
}

/** @param {string} link */
export async function setSupportLink(link) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO bot_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [KEY_SUPPORT_LINK, (link || '').trim()]
  );
}

/** @returns {Promise<Array<{id: number, name: string, cardNumber: string, sortOrder: number}>>} */
export async function getPaymentCards() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, name, cardNumber, sortOrder FROM payment_cards ORDER BY sortOrder ASC, id ASC'
  );
  return rows;
}

/** @param {string} name @param {string} cardNumber */
export async function addPaymentCard(name, cardNumber) {
  const pool = getPool();
  const [[{ nextOrder }]] = await pool.query(
    'SELECT COALESCE(MAX(sortOrder), 0) + 1 AS nextOrder FROM payment_cards'
  );
  const [r] = await pool.query(
    'INSERT INTO payment_cards (name, cardNumber, sortOrder) VALUES (?, ?, ?)',
    [name.trim(), (cardNumber || '').replace(/\s/g, ''), nextOrder]
  );
  return r.insertId;
}

/** @param {number} id @param {string} [name] @param {string} [cardNumber] */
export async function updatePaymentCard(id, name, cardNumber) {
  const pool = getPool();
  if (name !== undefined) {
    await pool.query('UPDATE payment_cards SET name = ? WHERE id = ?', [name.trim(), id]);
  }
  if (cardNumber !== undefined) {
    await pool.query('UPDATE payment_cards SET cardNumber = ? WHERE id = ?', [cardNumber.replace(/\s/g, ''), id]);
  }
}

/** @param {number} id */
export async function deletePaymentCard(id) {
  const pool = getPool();
  const [r] = await pool.query('DELETE FROM payment_cards WHERE id = ?', [id]);
  return r.affectedRows > 0;
}

/** یکی از کارت‌ها را برای نمایش به کاربر برمی‌گرداند (برای واریز/خرید) */
export async function getOneCardForPayment() {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT id, name, cardNumber FROM payment_cards ORDER BY RAND() LIMIT 1'
  );
  return rows[0] || null;
}

/** آیا روش پرداخت کارتی فعال و حداقل یک کارت وجود دارد؟ */
export async function isCardPaymentAvailable() {
  const method = await getPaymentMethod();
  if (method !== METHOD_CARD) return false;
  const cards = await getPaymentCards();
  return cards.length > 0;
}
