import { getPool } from './database.js';

/**
 * پیدا کردن کانال بر اساس channelID
 */
export const findChannelByID = async (channelID) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM `channels` WHERE `channelID` = ? LIMIT 1',
      [channelID]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error finding channel:', error);
    throw error;
  }
};

/**
 * پیدا کردن کانال بر اساس ID دیتابیس
 */
export const findChannelByDatabaseID = async (id) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM `channels` WHERE `id` = ? LIMIT 1',
      [id]
    );
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error finding channel by database ID:', error);
    throw error;
  }
};

/**
 * دریافت لیست تمام کانال‌ها
 */
export const getAllChannels = async () => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM `channels` ORDER BY `createdAt` DESC'
    );
    return result;
  } catch (error) {
    console.error('Error getting all channels:', error);
    throw error;
  }
};

/**
 * بروزرسانی وضعیت قفل کانال
 */
export const updateChannelLockStatus = async (channelID, isLocked) => {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE `channels` SET `isLocked` = ? WHERE `channelID` = ?',
      [isLocked ? 1 : 0, channelID]
    );
    return await findChannelByID(channelID);
  } catch (error) {
    console.error('Error updating channel lock status:', error);
    throw error;
  }
};

/**
 * بروزرسانی وضعیت قفل کانال بر اساس ID دیتابیس
 */
export const updateChannelLockStatusByDatabaseID = async (id, isLocked) => {
  try {
    const pool = getPool();
    await pool.query(
      'UPDATE `channels` SET `isLocked` = ? WHERE `id` = ?',
      [isLocked ? 1 : 0, id]
    );
    return await findChannelByDatabaseID(id);
  } catch (error) {
    console.error('Error updating channel lock status by database ID:', error);
    throw error;
  }
};

/**
 * دریافت تعداد اعضای واقعی کانال از Telegram
 */
export const getChannelRealMemberCount = async (botApi, channelID) => {
  try {
    const memberCount = await botApi.getChatMembersCount(channelID);
    return memberCount;
  } catch (error) {
    console.error('Error getting channel member count:', error);
    return null;
  }
};

