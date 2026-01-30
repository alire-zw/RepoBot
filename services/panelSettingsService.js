import { getPool } from './database.js';

const KEYS = {
  TRIAL_ENABLED: 'trial_enabled',
  TRIAL_SERVER_ID: 'trial_server_id',
  TRIAL_INBOUND_ID: 'trial_inbound_id',
  CLEAN_INACTIVE_ENABLED: 'clean_inactive_enabled',
  AUTO_BACKUP_ENABLED: 'auto_backup_enabled',
  AUTO_BACKUP_CHANNEL_ID: 'auto_backup_channel_id'
};

async function getSetting(key) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT `value` FROM bot_settings WHERE `key` = ? LIMIT 1',
    [key]
  );
  return rows[0]?.value ?? null;
}

async function setSetting(key, value) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO bot_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    [key, value == null ? '' : String(value)]
  );
}

export async function getTrialEnabled() {
  const v = await getSetting(KEYS.TRIAL_ENABLED);
  return v === '1' || v === 'true';
}

export async function setTrialEnabled(enabled) {
  await setSetting(KEYS.TRIAL_ENABLED, enabled ? '1' : '0');
}

export async function getTrialServerId() {
  const v = await getSetting(KEYS.TRIAL_SERVER_ID);
  return v ? parseInt(v, 10) : null;
}

export async function setTrialServerId(id) {
  await setSetting(KEYS.TRIAL_SERVER_ID, id == null ? '' : id);
}

export async function getTrialInboundId() {
  const v = await getSetting(KEYS.TRIAL_INBOUND_ID);
  return v ?? null;
}

export async function setTrialInboundId(id) {
  await setSetting(KEYS.TRIAL_INBOUND_ID, id == null ? '' : id);
}

export async function getCleanInactiveEnabled() {
  const v = await getSetting(KEYS.CLEAN_INACTIVE_ENABLED);
  return v === '1' || v === 'true';
}

export async function setCleanInactiveEnabled(enabled) {
  await setSetting(KEYS.CLEAN_INACTIVE_ENABLED, enabled ? '1' : '0');
}

export async function getAutoBackupEnabled() {
  const v = await getSetting(KEYS.AUTO_BACKUP_ENABLED);
  return v === '1' || v === 'true';
}

export async function setAutoBackupEnabled(enabled) {
  await setSetting(KEYS.AUTO_BACKUP_ENABLED, enabled ? '1' : '0');
}

export async function getAutoBackupChannelId() {
  const v = await getSetting(KEYS.AUTO_BACKUP_CHANNEL_ID);
  return (v || '').trim() || null;
}

export async function setAutoBackupChannelId(channelId) {
  await setSetting(KEYS.AUTO_BACKUP_CHANNEL_ID, channelId == null ? '' : String(channelId));
}

/** آیا کاربر قبلاً اشتراک تست گرفته؟ */
export async function hasUserClaimedTrial(userID) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM user_trial_claims WHERE userID = ? LIMIT 1',
    [userID]
  );
  return rows.length > 0;
}

/** ثبت استفاده کاربر از اشتراک تست */
export async function markTrialClaimed(userID) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO user_trial_claims (userID) VALUES (?) ON DUPLICATE KEY UPDATE claimedAt = CURRENT_TIMESTAMP',
    [userID]
  );
}

/** ریست دریافت تست برای همه کاربران (همه دوباره می‌توانند یک‌بار تست بگیرند) */
export async function resetAllTrialClaims() {
  const pool = getPool();
  const [r] = await pool.query('DELETE FROM user_trial_claims');
  return r.affectedRows ?? 0;
}
