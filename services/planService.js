import { getPool } from './database.js';

/**
 * دریافت لیست تمام پلن‌ها
 */
export const getAllPlans = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT p.*, c.name AS categoryName, s.serverName FROM `plans` p LEFT JOIN `categories` c ON p.categoryId = c.id LEFT JOIN `servers` s ON p.serverId = s.id ORDER BY p.createdAt DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error getting all plans:', error);
    throw error;
  }
};

/**
 * پیدا کردن پلن بر اساس ID
 */
export const findPlanById = async (id) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT p.*, c.name AS categoryName, s.serverName FROM `plans` p LEFT JOIN `categories` c ON p.categoryId = c.id LEFT JOIN `servers` s ON p.serverId = s.id WHERE p.id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error finding plan by ID:', error);
    throw error;
  }
};

/**
 * ایجاد پلن جدید
 */
export const createPlan = async (data) => {
  try {
    const pool = getPool();
    const {
      name,
      volumeGB,
      durationDays,
      categoryId,
      serverId,
      inboundId,
      inboundTag,
      capacityLimited,
      capacity,
      priceToman
    } = data;
    const [result] = await pool.query(
      `INSERT INTO \`plans\` (\`name\`, \`volumeGB\`, \`durationDays\`, \`categoryId\`, \`serverId\`, \`inboundId\`, \`inboundTag\`, \`capacityLimited\`, \`capacity\`, \`priceToman\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        volumeGB,
        durationDays,
        categoryId,
        serverId,
        String(inboundId),
        inboundTag || null,
        capacityLimited ? 1 : 0,
        capacity ?? null,
        priceToman
      ]
    );
    return { id: result.insertId, ...data };
  } catch (error) {
    console.error('Error creating plan:', error);
    throw error;
  }
};

/**
 * بروزرسانی پلن
 */
export const updatePlan = async (id, data) => {
  try {
    const pool = getPool();
    const allowed = [
      'name', 'volumeGB', 'durationDays', 'categoryId', 'serverId',
      'inboundId', 'inboundTag', 'capacityLimited', 'capacity', 'priceToman'
    ];
    const fields = [];
    const values = [];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`\`${key}\` = ?`);
        if (key === 'capacityLimited') values.push(data[key] ? 1 : 0);
        else if (key === 'capacity') values.push(data[key] ?? null);
        else values.push(data[key]);
      }
    }
    if (fields.length === 0) return await findPlanById(id);
    values.push(id);
    await pool.query(`UPDATE \`plans\` SET ${fields.join(', ')} WHERE \`id\` = ?`, values);
    return await findPlanById(id);
  } catch (error) {
    console.error('Error updating plan:', error);
    throw error;
  }
};

/**
 * حذف پلن
 */
export const deletePlan = async (id) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM `plans` WHERE `id` = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error deleting plan:', error);
    throw error;
  }
};

/**
 * سرورهای فعالی که حداقل یک پلن با ظرفیت دارند
 */
export const getServersWithPlansWithCapacity = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT s.id, s.serverName, s.isActive
       FROM servers s
       INNER JOIN plans p ON p.serverId = s.id
       WHERE s.isActive = 1
         AND (p.capacityLimited = 0 OR (p.capacityLimited = 1 AND (p.capacity IS NULL OR p.capacity > 0)))
       ORDER BY s.serverName`
    );
    return rows;
  } catch (error) {
    console.error('Error getServersWithPlansWithCapacity:', error);
    throw error;
  }
};

/**
 * دسته‌بندی‌هایی که برای یک سرور پلن با ظرفیت دارند
 */
export const getCategoriesWithPlansForServer = async (serverId) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT DISTINCT c.id, c.name
       FROM categories c
       INNER JOIN plans p ON p.categoryId = c.id
       WHERE p.serverId = ?
         AND (p.capacityLimited = 0 OR (p.capacityLimited = 1 AND (p.capacity IS NULL OR p.capacity > 0)))
       ORDER BY c.name`,
      [serverId]
    );
    return rows;
  } catch (error) {
    console.error('Error getCategoriesWithPlansForServer:', error);
    throw error;
  }
};

/**
 * پلن‌های یک سرور و دسته‌بندی با ظرفیت
 */
export const getPlansForServerAndCategory = async (serverId, categoryId) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS categoryName, s.serverName
       FROM plans p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN servers s ON p.serverId = s.id
       WHERE p.serverId = ? AND p.categoryId = ?
         AND (p.capacityLimited = 0 OR (p.capacityLimited = 1 AND (p.capacity IS NULL OR p.capacity > 0)))
       ORDER BY p.priceToman`,
      [serverId, categoryId]
    );
    return rows;
  } catch (error) {
    console.error('Error getPlansForServerAndCategory:', error);
    throw error;
  }
};

/**
 * کم کردن ظرفیت پلن (بعد از فروش)
 */
export const decrementPlanCapacity = async (planId) => {
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE plans SET capacity = capacity - 1, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND capacityLimited = 1 AND capacity IS NOT NULL AND capacity > 0`,
      [planId]
    );
    return true;
  } catch (error) {
    console.error('Error decrementPlanCapacity:', error);
    throw error;
  }
};
