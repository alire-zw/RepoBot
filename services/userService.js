import { getPool } from './database.js';
import crypto from 'crypto';

const generateRefCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getNextAvailableId = async (pool) => {
  const [rows] = await pool.query('SELECT id FROM users ORDER BY id');
  
  if (rows.length === 0) {
    return 1;
  }
  
  let expectedId = 1;
  for (const row of rows) {
    if (row.id !== expectedId) {
      return expectedId;
    }
    expectedId++;
  }
  
  return expectedId;
};

export const saveOrUpdateUser = async (userData) => {
  const pool = getPool();
  const { id: userID, first_name: name, username } = userData;

  try {
    const [existing] = await pool.query(
      'SELECT * FROM users WHERE userID = ?',
      [userID]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE users SET name = ?, username = ? WHERE userID = ?',
        [name, username || null, userID]
      );
      return false;
    } else {
      let refcode = generateRefCode();
      let exists = true;
      while (exists) {
        const [check] = await pool.query('SELECT refcode FROM users WHERE refcode = ?', [refcode]);
        if (check.length === 0) {
          exists = false;
        } else {
          refcode = generateRefCode();
        }
      }
      
      const nextId = await getNextAvailableId(pool);
      
      await pool.query(
        'INSERT INTO users (id, userID, name, username, refcode) VALUES (?, ?, ?, ?, ?)',
        [nextId, userID, name, username || null, refcode]
      );
      
      return true;
    }
  } catch (error) {
    console.error('Error saving/updating user:', error);
    throw error;
  }
};

export const getUserByID = async (userID) => {
  const pool = getPool();
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE userID = ?',
      [userID]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

