import { getPool } from './database.js';

/**
 * دریافت لیست تمام دسته‌بندی‌ها
 */
export const getAllCategories = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM `categories` ORDER BY `createdAt` DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error getting all categories:', error);
    throw error;
  }
};

/**
 * پیدا کردن دسته‌بندی بر اساس ID
 */
export const findCategoryById = async (id) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM `categories` WHERE `id` = ? LIMIT 1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error finding category by ID:', error);
    throw error;
  }
};

/**
 * ایجاد دسته‌بندی جدید (فقط نام)
 */
export const createCategory = async (name) => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'INSERT INTO `categories` (`name`) VALUES (?)',
      [name.trim()]
    );
    return {
      id: result.insertId,
      name: name.trim()
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

/**
 * بروزرسانی نام دسته‌بندی
 */
export const updateCategory = async (id, name) => {
  try {
    const pool = getPool();
    await pool.query('UPDATE `categories` SET `name` = ? WHERE `id` = ?', [
      name.trim(),
      id
    ]);
    return await findCategoryById(id);
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

/**
 * حذف دسته‌بندی
 */
export const deleteCategory = async (id) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM `categories` WHERE `id` = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};
