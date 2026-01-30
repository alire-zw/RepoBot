import { getPool } from './database.js';
import { updateUserBalance } from './walletService.js';
import config from '../config/env.js';

export const handleReferral = async (newUserID, refcode) => {
  if (!refcode || !config.REF_MONEY || config.REF_MONEY <= 0) {
    console.log(`Referral skipped: refcode=${refcode}, REF_MONEY=${config.REF_MONEY}`);
    return false;
  }

  try {
    const pool = getPool();
    
    const [referrer] = await pool.query(
      'SELECT userID FROM users WHERE refcode = ? LIMIT 1',
      [refcode]
    );

    if (referrer.length === 0) {
      console.log(`Referrer not found for refcode: ${refcode}`);
      return false;
    }

    const referrerID = referrer[0].userID;

    if (referrerID === newUserID) {
      console.log(`User ${newUserID} tried to refer themselves`);
      return false;
    }

    const [existing] = await pool.query(
      'SELECT referredby FROM users WHERE userID = ? LIMIT 1',
      [newUserID]
    );

    if (existing.length === 0) {
      console.log(`User ${newUserID} not found in database`);
      return false;
    }

    if (existing[0].referredby) {
      console.log(`User ${newUserID} already has a referrer: ${existing[0].referredby}`);
      return false;
    }

    await pool.query(
      'UPDATE users SET referredby = ? WHERE userID = ?',
      [referrerID, newUserID]
    );

    await updateUserBalance(referrerID, config.REF_MONEY);

    console.log(`Referral reward: ${config.REF_MONEY} added to user ${referrerID} for referring ${newUserID}`);
    return true;
  } catch (error) {
    console.error('Error handling referral:', error);
    return false;
  }
};

