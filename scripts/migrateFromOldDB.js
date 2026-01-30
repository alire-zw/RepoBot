import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/env.js';
import { getPool } from '../services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const parseRow = (rowStr) => {
  rowStr = rowStr.replace(/^\(/, '').replace(/\)$/, '').trim();
  
  const values = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let inJson = false;
  let braceCount = 0;
  
  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];
    const nextChar = rowStr[i + 1];
    
    if ((char === '"' || char === "'") && (i === 0 || rowStr[i - 1] !== '\\')) {
      if (!inQuotes && !inJson) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        values.push(current);
        current = '';
        if (nextChar === ',') i++;
        continue;
      }
    }
    
    if (char === '{' && !inQuotes) {
      inJson = true;
      braceCount = 1;
    }
    if (char === '}' && !inQuotes && inJson) {
      braceCount--;
      if (braceCount === 0) {
        inJson = false;
      }
    }
    if (char === '{' && !inQuotes && inJson) braceCount++;
    
    if (!inQuotes && !inJson && char === ',') {
      if (current.trim() || current === '') {
        const trimmed = current.trim();
        values.push(trimmed === 'NULL' ? null : trimmed);
        current = '';
      }
      continue;
    }
    
    current += char;
  }
  
  if (current.trim() || current === '') {
    const trimmed = current.trim();
    values.push(trimmed === 'NULL' ? null : trimmed);
  }
  
  return values;
};

const parseSQLFile = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const users = [];
  
  const insertMatches = content.matchAll(/INSERT INTO[^;]+VALUES\s*([^;]+);/gs);
  
  let totalRows = 0;
  
  for (const insertMatch of insertMatches) {
    const valuesString = insertMatch[1].trim();
    const rowStrings = valuesString.split(/\),\s*\(/);
    
    rowStrings.forEach((rowStr) => {
      totalRows++;
      const values = parseRow(rowStr);
      
      if (values.length < 6) {
        if (totalRows <= 10) {
          console.log(`Warning: Row ${totalRows} has only ${values.length} values, expected at least 6`);
        }
        return;
      }
      
      const id = values[0] ? parseInt(values[0]) : null;
      const userid = values[1]?.replace(/['"]/g, '') || '';
      const name = values[2]?.replace(/['"]/g, '') || '';
      const username = values[3]?.replace(/['"]/g, '') || '';
      const refcode = values[4]?.replace(/['"]/g, '') || '0';
      const wallet = values[5] ? parseInt(values[5]) : 0;
      const date = values[6]?.replace(/['"]/g, '') || '';
      const refered_by = values[8] ? (values[8] === 'NULL' || values[8] === null ? null : parseInt(values[8])) : null;
      
      if (userid && !isNaN(parseInt(userid))) {
        users.push({
          id,
          userid: parseInt(userid),
          name,
          username,
          refcode: refcode === '0' ? null : refcode,
          wallet,
          date,
          refered_by
        });
      } else if (totalRows <= 10) {
        console.log(`Warning: Row ${totalRows} (ID: ${id}) has invalid userid: ${userid}`);
      }
    });
  }
  
  console.log(`Parsed ${totalRows} rows, found ${users.length} valid users`);
  return users;
};

const migrateUsers = async () => {
  try {
    const sqlFilePath = path.join(__dirname, '../backup/users.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    console.log('Reading SQL file...');
    const oldUsers = parseSQLFile(sqlFilePath);
    console.log(`Found ${oldUsers.length} users in SQL file`);
    
    if (oldUsers.length === 0) {
      console.log('No users to migrate');
      return;
    }
    
    const pool = getPool();
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    let invalidUserID = 0;
    let duplicateUserID = 0;
    
    for (const oldUser of oldUsers) {
      try {
        if (!oldUser.userid || isNaN(oldUser.userid)) {
          invalidUserID++;
          if (invalidUserID <= 10) {
            console.log(`Skipping user with invalid userID: ID=${oldUser.id}, userID=${oldUser.userid}`);
          }
          skipped++;
          continue;
        }
        
        const [existing] = await pool.query(
          'SELECT * FROM users WHERE userID = ?',
          [oldUser.userid]
        );
        
        if (existing.length > 0) {
          duplicateUserID++;
          if (duplicateUserID <= 10) {
            console.log(`User ${oldUser.userid} already exists, skipping...`);
          }
          skipped++;
          continue;
        }
        
        let refcode = oldUser.refcode;
        if (!refcode || refcode === '0' || refcode.length !== 6) {
          refcode = generateRefCode();
          let exists = true;
          while (exists) {
            const [check] = await pool.query('SELECT refcode FROM users WHERE refcode = ?', [refcode]);
            if (check.length === 0) {
              exists = false;
            } else {
              refcode = generateRefCode();
            }
          }
        } else {
          const [check] = await pool.query('SELECT refcode FROM users WHERE refcode = ?', [refcode]);
          if (check.length > 0) {
            refcode = generateRefCode();
            let exists = true;
            while (exists) {
              const [check2] = await pool.query('SELECT refcode FROM users WHERE refcode = ?', [refcode]);
              if (check2.length === 0) {
                exists = false;
              } else {
                refcode = generateRefCode();
              }
            }
          }
        }
        
        const nextId = await getNextAvailableId(pool);
        
        let datejoined = new Date();
        if (oldUser.date) {
          const timestamp = parseInt(oldUser.date);
          if (!isNaN(timestamp)) {
            datejoined = new Date(timestamp * 1000);
          }
        }
        
        await pool.query(
          `INSERT INTO users (id, userID, name, username, balance, refcode, referredby, datejoined) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextId,
            oldUser.userid,
            oldUser.name,
            oldUser.username || null,
            oldUser.wallet || 0,
            refcode,
            oldUser.refered_by || null,
            datejoined
          ]
        );
        
        console.log(`Migrated user: ${oldUser.name} (ID: ${nextId}, userID: ${oldUser.userid})`);
        migrated++;
      } catch (error) {
        console.error(`Error migrating user ${oldUser.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`  - Invalid userID: ${invalidUserID}`);
    console.log(`  - Duplicate userID: ${duplicateUserID}`);
    console.log(`Errors: ${errors}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
};

migrateUsers();

