import mysql from 'mysql2/promise';
import config from '../config/env.js';

let pool = null;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      port: config.DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
};

export const initDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      port: config.DB_PORT,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.DB_NAME}\``);
    await connection.end();

    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY,
        userID BIGINT UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255),
        balance BIGINT DEFAULT 0,
        refcode VARCHAR(6) UNIQUE,
        referredby BIGINT,
        ispremium BOOLEAN DEFAULT FALSE,
        isBlocked TINYINT(1) DEFAULT 0,
        datejoined DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userID (userID),
        INDEX idx_refcode (refcode)
      )
    `);

    // Add isBlocked column if it doesn't exist
    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'isBlocked'
      `, [config.DB_NAME]);
      
      if (columns.length === 0) {
        await pool.query(`
          ALTER TABLE users 
          ADD COLUMN isBlocked TINYINT(1) DEFAULT 0
        `);
        console.log('isBlocked column added to users table');
      }
    } catch (error) {
      console.error('Error adding isBlocked column:', error);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS charges (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID BIGINT NOT NULL,
        amount BIGINT NOT NULL,
        cardNumber VARCHAR(50),
        cardName VARCHAR(255),
        receiptImagePath VARCHAR(500),
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approvedBy BIGINT,
        rejectedBy BIGINT,
        rejectReason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userID (userID),
        INDEX idx_status (status)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channelID BIGINT NOT NULL UNIQUE,
        channelName VARCHAR(255) NOT NULL,
        channelUsername VARCHAR(255),
        buttonLabel VARCHAR(255) DEFAULT 'تایید عضویت',
        inviteLink VARCHAR(500),
        isLocked TINYINT(1) DEFAULT 0,
        memberCount INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_channelID (channelID),
        INDEX idx_isLocked (isLocked)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        serverName VARCHAR(255) NOT NULL,
        serverIP VARCHAR(255) NOT NULL,
        serverDomain VARCHAR(255),
        port INT NOT NULL,
        serverPath VARCHAR(255),
        userName VARCHAR(255) NOT NULL,
        userPassword VARCHAR(255) NOT NULL,
        remark TEXT,
        sessionCookie TEXT,
        sessionCookieUpdatedAt DATETIME,
        isActive TINYINT(1) DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_isActive (isActive)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        volumeGB INT NOT NULL,
        durationDays INT NOT NULL,
        categoryId INT NOT NULL,
        serverId INT NOT NULL,
        inboundId VARCHAR(100) NOT NULL,
        inboundTag VARCHAR(255),
        capacityLimited TINYINT(1) NOT NULL DEFAULT 1,
        capacity INT NULL,
        priceToman BIGINT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_categoryId (categoryId),
        INDEX idx_serverId (serverId)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID BIGINT NOT NULL,
        planId INT NOT NULL,
        amount BIGINT NOT NULL,
        paymentMethod ENUM('wallet', 'card') NOT NULL,
        status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
        receiptImagePath VARCHAR(500),
        approvedBy BIGINT,
        rejectedBy BIGINT,
        rejectReason TEXT,
        clientConfig TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_userID (userID),
        INDEX idx_planId (planId),
        INDEX idx_status (status)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID BIGINT NOT NULL,
        planId INT NOT NULL,
        inboundId VARCHAR(100) DEFAULT NULL,
        planName VARCHAR(255) NOT NULL,
        serverId INT NOT NULL,
        serverName VARCHAR(255) NOT NULL,
        volumeGB INT NOT NULL,
        durationDays INT NOT NULL,
        connectionLink TEXT,
        clientEmail VARCHAR(255) NOT NULL,
        expiryTime BIGINT DEFAULT NULL,
        paymentMethod ENUM('wallet', 'card') NOT NULL,
        planOrderId INT DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userID (userID),
        INDEX idx_planId (planId),
        INDEX idx_createdAt (createdAt)
      )
    `);

    try {
      const [subCols] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_subscriptions' AND COLUMN_NAME = 'inboundId'
      `, [config.DB_NAME]);
      if (subCols.length === 0) {
        await pool.query(`ALTER TABLE user_subscriptions ADD COLUMN inboundId VARCHAR(100) DEFAULT NULL AFTER planId`);
        console.log('user_subscriptions: inboundId column added');
      }
    } catch (e) {
      console.error('Error adding inboundId to user_subscriptions:', e);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_renewals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID BIGINT NOT NULL,
        subscriptionId INT NOT NULL,
        planId INT NOT NULL,
        amount BIGINT NOT NULL,
        paymentMethod ENUM('wallet', 'card') NOT NULL,
        status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
        receiptImagePath VARCHAR(500) DEFAULT NULL,
        approvedBy BIGINT DEFAULT NULL,
        rejectedBy BIGINT DEFAULT NULL,
        rejectReason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_userID (userID),
        INDEX idx_subscriptionId (subscriptionId),
        INDEX idx_status (status)
      )
    `);

    try {
      const [planOrderTables] = await pool.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'plan_orders'
      `, [config.DB_NAME]);
      if (planOrderTables.length === 0) {
        await pool.query(`
          CREATE TABLE plan_orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userID BIGINT NOT NULL,
            planId INT NOT NULL,
            amount BIGINT NOT NULL,
            paymentMethod ENUM('wallet', 'card') NOT NULL,
            status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
            receiptImagePath VARCHAR(500),
            approvedBy BIGINT,
            rejectedBy BIGINT,
            rejectReason TEXT,
            clientConfig TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_userID (userID),
            INDEX idx_planId (planId),
            INDEX idx_status (status)
          )
        `);
        console.log('plan_orders table created (migration)');
      }
    } catch (e) {
      console.error('Error ensuring plan_orders table:', e);
    }

    try {
      const [cols] = await pool.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'servers' AND COLUMN_NAME = 'sessionCookie'
      `, [config.DB_NAME]);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE servers ADD COLUMN sessionCookie TEXT`);
        await pool.query(`ALTER TABLE servers ADD COLUMN sessionCookieUpdatedAt DATETIME`);
        console.log('servers: sessionCookie columns added');
      }
    } catch (e) {
      console.error('Error adding sessionCookie to servers:', e);
    }

    try {
      const [columns] = await pool.query(`
        SELECT COLUMN_TYPE, COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'balance'
      `, [config.DB_NAME]);

      if (columns.length > 0) {
        const columnType = columns[0].COLUMN_TYPE;
        if (columnType.includes('decimal') || columnType.includes('DECIMAL')) {
          await pool.query(`
            ALTER TABLE users 
            MODIFY COLUMN balance BIGINT DEFAULT 0
          `);
          console.log('Balance column updated to BIGINT');
        }
      }

      const [idColumns] = await pool.query(`
        SELECT COLUMN_KEY, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'
      `, [config.DB_NAME]);

      if (idColumns.length > 0 && idColumns[0].EXTRA.includes('auto_increment')) {
        await pool.query(`
          ALTER TABLE users 
          MODIFY COLUMN id INT NOT NULL
        `);
        console.log('ID column updated to remove AUTO_INCREMENT');
      }
    } catch (migrationError) {
      console.log('Migration check completed (table may not exist yet)');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        \`value\` TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        cardNumber VARCHAR(50) NOT NULL,
        sortOrder INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sortOrder (sortOrder)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_trial_claims (
        userID BIGINT PRIMARY KEY,
        claimedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

