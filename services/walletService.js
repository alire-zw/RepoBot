import { getPool } from './database.js';

export const getUserBalance = async (userID) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT balance FROM users WHERE userID = ? LIMIT 1',
      [userID]
    );
    return result.length > 0 ? (result[0].balance || 0) : 0;
  } catch (error) {
    console.error('Error getting user balance:', error);
    return 0;
  }
};

export const updateUserBalance = async (userID, amount) => {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE users SET balance = balance + ? WHERE userID = ?',
      [amount, userID]
    );
    return true;
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw error;
  }
};

