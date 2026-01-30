import { getPool } from './database.js';

/**
 * دریافت لیست تمام سرورها
 */
export const getAllServers = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM `servers` ORDER BY `createdAt` DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error getting all servers:', error);
    throw error;
  }
};

/**
 * دریافت لیست سرورهای فعال
 */
export const getActiveServers = async () => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM `servers` WHERE `isActive` = 1 ORDER BY `createdAt` DESC'
    );
    return rows;
  } catch (error) {
    console.error('Error getting active servers:', error);
    throw error;
  }
};

/**
 * پیدا کردن سرور بر اساس ID دیتابیس
 */
export const findServerByDatabaseID = async (id) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM `servers` WHERE `id` = ? LIMIT 1',
      [id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error finding server by database ID:', error);
    throw error;
  }
};

/**
 * ایجاد سرور جدید (بدون clientTotalGB و clientExpiryHours).
 * در صورت ارسال sessionCookie و sessionCookieUpdatedAt ذخیره می‌شود.
 */
export const createServer = async (serverData) => {
  try {
    const {
      serverName,
      serverIP,
      serverDomain,
      port,
      serverPath,
      userName,
      userPassword,
      remark,
      isActive,
      sessionCookie,
      sessionCookieUpdatedAt
    } = serverData;

    const pool = getPool();
    const [result] = await pool.query(
      `INSERT INTO \`servers\`
       (\`serverName\`, \`serverIP\`, \`serverDomain\`, \`port\`, \`serverPath\`, \`userName\`, \`userPassword\`, \`remark\`, \`sessionCookie\`, \`sessionCookieUpdatedAt\`, \`isActive\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serverName,
        serverIP,
        serverDomain || null,
        port,
        serverPath || null,
        userName,
        userPassword,
        remark || null,
        sessionCookie ?? null,
        sessionCookieUpdatedAt ?? null,
        isActive !== undefined ? (isActive ? 1 : 0) : 1
      ]
    );

    return {
      id: result.insertId,
      serverName,
      serverIP,
      serverDomain: serverDomain || null,
      port,
      serverPath: serverPath || null,
      userName,
      userPassword,
      remark: remark || null,
      sessionCookie: sessionCookie ?? null,
      sessionCookieUpdatedAt: sessionCookieUpdatedAt ?? null,
      isActive: isActive !== undefined ? isActive : true
    };
  } catch (error) {
    console.error('Error creating server:', error);
    throw error;
  }
};

/**
 * بروزرسانی اطلاعات سرور
 */
export const updateServer = async (id, serverData) => {
  try {
    const pool = getPool();
    const fields = [];
    const values = [];

    const allowed = [
      'serverName', 'serverIP', 'serverDomain', 'port', 'serverPath',
      'userName', 'userPassword', 'remark', 'sessionCookie', 'sessionCookieUpdatedAt', 'isActive'
    ];
    for (const key of allowed) {
      if (serverData[key] !== undefined) {
        if (key === 'isActive') {
          fields.push('`isActive` = ?');
          values.push(serverData[key] === true || serverData[key] === 1 || serverData[key] === '1' ? 1 : 0);
        } else if (key === 'serverDomain' || key === 'serverPath' || key === 'remark' || key === 'sessionCookie' || key === 'sessionCookieUpdatedAt') {
          fields.push(`\`${key}\` = ?`);
          values.push(serverData[key] ?? null);
        } else {
          fields.push(`\`${key}\` = ?`);
          values.push(serverData[key]);
        }
      }
    }

    if (fields.length === 0) {
      return await findServerByDatabaseID(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE \`servers\` SET ${fields.join(', ')} WHERE \`id\` = ?`,
      values
    );
    return await findServerByDatabaseID(id);
  } catch (error) {
    console.error('Error updating server:', error);
    throw error;
  }
};

/**
 * حذف سرور از دیتابیس
 */
export const deleteServer = async (serverID) => {
  try {
    const pool = getPool();
    await pool.query('DELETE FROM `servers` WHERE `id` = ?', [serverID]);
    return true;
  } catch (error) {
    console.error('Error deleting server:', error);
    throw error;
  }
};

/**
 * Build panel base URL. Use https only for port 443; otherwise http (many panels run HTTP on custom ports).
 */
export const buildServerURL = (server) => {
  const { serverIP, serverDomain, port, serverPath } = server;
  const host = serverDomain || serverIP;
  const useHttps = port === 443 || port == null;
  const protocol = useHttps ? 'https' : 'http';
  let base = `${protocol}://${host}`;
  if (port && (port !== 443 || !serverDomain)) {
    base += `:${port}`;
  }
  if (serverPath) {
    const clean = String(serverPath).replace(/^\/+|\/+$/g, '');
    if (clean) base += `/${clean}`;
  }
  return base;
};

/**
 * Login and fetch inbounds list via panel API (Postman-style).
 * Tries stored sessionCookie first; on 401/failure clears it and does full login.
 * After successful login, saves session cookie to DB.
 */
async function xuiLoginAndGetInbounds(server) {
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  let useHttps = u.protocol === 'https:';
  let httpMod = useHttps ? await import('https') : await import('http');

  const doRequest = (mod, opts, body = null) =>
    new Promise((resolve, reject) => {
      const req = mod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: data
          })
        );
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.setTimeout(opts.timeout || 10000);
      if (body) req.write(body);
      req.end();
    });

  const listPath = basePath ? `${basePath}/panel/api/inbounds/list` : '/panel/api/inbounds/list';

  /** Fetch inbounds list with given cookie; follows one redirect. Returns inbounds array or throws. */
  async function fetchInboundsWithCookie(cookie) {
    let opts = {
      hostname,
      port,
      path: listPath,
      method: 'GET',
      headers: { Accept: 'application/json', Cookie: cookie },
      timeout: 10000
    };
    if (useHttps) opts.rejectUnauthorized = false;
    let listRes = await doRequest(httpMod, opts);
    if (listRes.statusCode === 301 || listRes.statusCode === 302) {
      const location = listRes.headers.location || listRes.headers.Location;
      if (location) {
        const redirUrl = new URL(location, baseURL);
        opts = {
          hostname: redirUrl.hostname,
          port: redirUrl.port ? parseInt(redirUrl.port, 10) : (redirUrl.protocol === 'https:' ? 443 : 80),
          path: redirUrl.pathname || listPath,
          method: 'GET',
          headers: { Accept: 'application/json', Cookie: cookie },
          timeout: 10000
        };
        if (redirUrl.protocol === 'https:') opts.rejectUnauthorized = false;
        const mod = redirUrl.protocol === 'https:' ? await import('https') : await import('http');
        listRes = await doRequest(mod, opts);
      }
    }
    const listBody = (listRes.body || '').trim();
    if (listRes.statusCode === 401 || listRes.statusCode === 403) {
      throw new Error('Session expired or unauthorized');
    }
    if (!listBody) throw new Error(`Inbounds list empty (status ${listRes.statusCode})`);
    let listData;
    try {
      listData = JSON.parse(listBody);
    } catch (e) {
      throw new Error(`Inbounds list invalid JSON (status ${listRes.statusCode})`);
    }
    if (!listData || listData.success !== true) {
      throw new Error(listData?.msg || 'Inbounds list failed');
    }
    return Array.isArray(listData.obj) ? listData.obj : [];
  }

  // Try stored cookie first
  if (server.sessionCookie && server.id) {
    try {
      const inbounds = await fetchInboundsWithCookie(server.sessionCookie);
      return { inbounds, cookie: server.sessionCookie };
    } catch (e) {
      await updateServer(server.id, { sessionCookie: null, sessionCookieUpdatedAt: null });
    }
  }

  const postBody = new URLSearchParams({
    username: server.userName,
    password: server.userPassword
  }).toString();

  let loginPath = basePath ? `${basePath}/login/` : '/login/';
  let loginOpts = {
    hostname,
    port,
    path: loginPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody)
    },
    timeout: 10000
  };
  if (useHttps) loginOpts.rejectUnauthorized = false;

  let loginRes = await doRequest(httpMod, loginOpts, postBody);

  /** استخراج کوکی از هدر Set-Cookie پاسخ (هم از پاسخ اول ۳۰۲ و هم از پاسخ بعد از ریدایرکت) */
  const extractCookie = (res) => {
    const setCookie = res?.headers?.['set-cookie'] || res?.headers?.['Set-Cookie'];
    if (!setCookie) return null;
    const list = Array.isArray(setCookie) ? setCookie : [setCookie];
    const parts = list.map((s) => (s && typeof s === 'string' ? s.split(';')[0].trim() : '')).filter(Boolean);
    return parts.length ? parts.join('; ') : null;
  };

  let cookie = extractCookie(loginRes);

  const isRedirect = (code) => [301, 302, 307, 308].includes(code);
  if (isRedirect(loginRes.statusCode)) {
    const location = loginRes.headers.location || loginRes.headers.Location;
    if (location) {
      const redirUrl = new URL(location, baseURL);
      hostname = redirUrl.hostname;
      port = redirUrl.port ? parseInt(redirUrl.port, 10) : (redirUrl.protocol === 'https:' ? 443 : 80);
      basePath = redirUrl.pathname === '/' ? '' : redirUrl.pathname.replace(/\/$/, '');
      useHttps = redirUrl.protocol === 'https:';
      httpMod = useHttps ? await import('https') : await import('http');
      loginPath = redirUrl.pathname || loginPath;
      loginOpts = {
        hostname,
        port,
        path: loginPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postBody)
        },
        timeout: 10000
      };
      if (useHttps) loginOpts.rejectUnauthorized = false;
      loginRes = await doRequest(httpMod, loginOpts, postBody);
      if (!cookie) cookie = extractCookie(loginRes);
      if (isRedirect(loginRes.statusCode)) {
        throw new Error('Too many redirects on login');
      }
    }
  }

  if (!cookie) {
    if (loginRes.statusCode === 200 && loginRes.body && loginRes.body.trim()) {
      try {
        const data = JSON.parse(loginRes.body);
        if (!data || data.success !== true) {
          throw new Error(data?.msg || 'Login failed');
        }
      } catch (e) {
        if (e.message && (e.message.includes('Login') || e.message.includes('failed'))) throw e;
        throw new Error(`Login bad response (status ${loginRes.statusCode}, body length ${(loginRes.body || '').length})`);
      }
    }
    throw new Error('No session cookie after login');
  }

  if (server.id) {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await updateServer(server.id, { sessionCookie: cookie, sessionCookieUpdatedAt: now });
  }

  const inbounds = await fetchInboundsWithCookie(cookie);
  return { inbounds, cookie };
}

/**
 * فقط لاگین و دریافت کوکی (برای مرحلهٔ افزودن سرور قبل از ذخیره).
 * سرور را در دیتابیس ذخیره نمی‌کند؛ در صورت موفقیت کوکی و زمان را برمی‌گرداند.
 * @param {Object} serverData - حداقل: serverIP, port, userName, userPassword؛ اختیاری: serverDomain, serverPath, serverName
 * @returns {{ success: true, sessionCookie: string, sessionCookieUpdatedAt: string } | { success: false, error: string }}
 */
export async function loginAndGetSessionCookie(serverData) {
  const serverLike = {
    serverName: serverData.serverName || 'Temp',
    serverIP: serverData.serverIP,
    serverDomain: serverData.serverDomain || null,
    port: serverData.port,
    serverPath: serverData.serverPath || null,
    userName: serverData.userName,
    userPassword: serverData.userPassword,
    id: null,
    sessionCookie: null
  };
  try {
    const result = await xuiLoginAndGetInbounds(serverLike);
    const cookie = result?.cookie;
    if (cookie) {
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return { success: true, sessionCookie: cookie, sessionCookieUpdatedAt: now };
    }
    return { success: false, error: 'No session cookie after login' };
  } catch (e) {
    const msg = e.message || String(e);
    return { success: false, error: msg };
  }
}

/**
 * پارس آمار از آرایه اینباندهای خام API (ساختار Postman: up, down, clientStats, settings)
 */
function parseInboundsStats(inbounds) {
  let totalClients = 0;
  let onlineClients = 0;
  let totalUpload = 0;
  let totalDownload = 0;
  for (const ib of inbounds) {
    if (ib.up != null) totalUpload += Number(ib.up) || 0;
    if (ib.down != null) totalDownload += Number(ib.down) || 0;
    if (Array.isArray(ib.clientStats)) {
      totalClients += ib.clientStats.length;
      onlineClients += ib.clientStats.filter((c) => (c.lastOnline && c.lastOnline > 0) || c.enable).length;
    }
    if (typeof ib.settings === 'string' && ib.settings) {
      try {
        const s = JSON.parse(ib.settings);
        if (Array.isArray(s.clients)) totalClients = Math.max(totalClients, s.clients.length);
      } catch (_) {}
    }
  }
  return {
    totalInbounds: inbounds.length,
    totalClients,
    onlineClients,
    totalUpload,
    totalDownload,
    totalTraffic: totalUpload + totalDownload
  };
}

/**
 * Check panel connection (direct API, logs in English).
 */
export const checkServerConnection = async (server) => {
  const baseURL = buildServerURL(server);
  console.log(`[Server] Checking connection: ${server.serverName} (${baseURL})`);

  try {
    const { inbounds } = await xuiLoginAndGetInbounds(server);
    console.log(`[Server] OK connected: ${server.serverName} (inbounds: ${inbounds.length})`);
    return { success: true, error: null };
  } catch (err) {
    const msg = err.message || String(err);
    console.log(`[Server] Connection error: ${server.serverName} - ${msg}`);
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
      return { success: false, error: 'Network error' };
    }
    if (msg.includes('401') || msg.includes('Invalid') || msg.includes('password') || msg.includes('Login')) {
      return { success: false, error: 'Invalid username or password' };
    }
    return await checkServerConnectionFallback(server, baseURL);
  }
};

async function checkServerConnectionFallback(server, baseURL) {
  const url = new URL(baseURL);
  const useHttps = url.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const options = {
    hostname: url.hostname,
    port: url.port || (useHttps ? 443 : 80),
    path: url.pathname || '/',
    method: 'GET',
    timeout: 8000
  };
  if (useHttps) options.rejectUnauthorized = false;

  return new Promise((resolve) => {
    const req = httpMod.request(options, (res) => {
      const status = res.statusCode || 0;
      if (status === 200 || status === 401 || status === 302 || status === 301) {
        console.log(`[Server] OK fallback: ${server.serverName} - status ${status}`);
        resolve({ success: true, error: null });
      } else {
        console.log(`[Server] Fallback: ${server.serverName} - status ${status}`);
        resolve({ success: false, error: `Status ${status}` });
      }
    });
    req.on('error', (e) => {
      console.log(`[Server] Fallback failed: ${server.serverName} - ${e.message}`);
      resolve({ success: false, error: e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' ? 'Network error' : e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      console.log(`[Server] Fallback timeout: ${server.serverName}`);
      resolve({ success: false, error: 'Connection timeout' });
    });
    req.setTimeout(8000);
    req.end();
  });
}

/**
 * Get server stats from panel (direct API, logs in English).
 */
export const getServerStats = async (server) => {
  console.log(`[Server] Fetching stats: ${server.serverName}`);

  try {
    const { inbounds } = await xuiLoginAndGetInbounds(server);
    const stats = parseInboundsStats(inbounds);
    console.log(`[Server] Stats: ${server.serverName} - inbounds: ${stats.totalInbounds}, clients: ${stats.totalClients}, traffic: ${stats.totalTraffic}`);
    return { success: true, stats };
  } catch (err) {
    console.log(`[Server] Stats error: ${server.serverName} - ${err.message || err}`);
    return { success: false, stats: null };
  }
};

/**
 * دریافت لیست اینباندهای یک سرور (برای انتخاب در پلن و غیره)
 */
export const getServerInbounds = async (server) => {
  const { inbounds } = await xuiLoginAndGetInbounds(server);
  return inbounds;
};

/**
 * فرمت حجم (بایت به KB, MB, GB)
 */
export const formatBytes = (bytes) => {
  if (bytes == null || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const num = typeof bytes === 'string' ? parseFloat(bytes) : Number(bytes);
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  return (num / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

/**
 * پیدا کردن شمارهٔ بعدی کلاینت برای فرمت «remark - N» از روی کلاینت‌های موجود در اینباند پنل.
 * @param {Object} server - رکورد سرور
 * @param {string|number} inboundId - شناسه اینباند
 * @param {string} remarkPrefix - پیشوند (مثلاً remark سرور)
 * @returns {Promise<number>} شمارهٔ بعدی (۱ اگر هیچ کلاینتی نبود)
 */
export async function getNextClientNumber(server, inboundId, remarkPrefix) {
  const prefix = (remarkPrefix || '').trim();
  const suffix = ' - ';
  const fullPrefix = prefix + suffix;
  let inbounds;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    inbounds = result.inbounds;
  } catch (e) {
    console.error('[Server] getNextClientNumber login error:', e?.message);
    return 1;
  }
  const inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(inboundId));
  if (!inbound) return 1;
  let settings;
  try {
    const raw = inbound.settings;
    settings = typeof raw === 'string' ? (raw ? JSON.parse(raw) : {}) : (raw || {});
  } catch (_) {
    return 1;
  }
  const clients = settings.clients;
  if (!Array.isArray(clients)) return 1;
  let maxNum = 0;
  for (const c of clients) {
    const email = (c && c.email) ? String(c.email).trim() : '';
    if (!email.startsWith(fullPrefix)) continue;
    const rest = email.slice(fullPrefix.length);
    const num = parseInt(rest, 10);
    if (Number.isInteger(num) && num >= 1 && String(num) === rest) {
      maxNum = Math.max(maxNum, num);
    }
  }
  return maxNum + 1;
}

/**
 * پارس JSON از فیلد string اینباند (settings یا streamSettings).
 */
function parseInboundJsonField(raw) {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw;
  try {
    return typeof raw === 'string' && raw.trim() ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

/**
 * ساخت لینک اتصال کلاینت مطابق پنل 3x-ui از روی streamSettings و settings اینباند.
 * لینک واقعی پنل شامل type, encryption, path, host, headerType, security و fragment (email) است.
 * @param {Object} server - رکورد سرور (serverDomain یا serverIP)
 * @param {Object} inbound - رکورد اینباند از پنل (port, protocol, streamSettings, settings)
 * @param {string} uuid - uuid کلاینت (برای vmess/vless) یا password (برای trojan)
 * @param {string} clientEmail - ایمیل کلاینت (برای fragment لینک)
 * @returns {string|null} لینک یا null
 */
export function buildClientConnectionLink(server, inbound, uuid, clientEmail = '') {
  const host = (server.serverDomain || server.serverIP || '').trim();
  if (!host) return null;
  const port = inbound.port != null ? Number(inbound.port) : (inbound.listen && parseInt(inbound.listen, 10));
  if (!port || isNaN(port)) return null;
  const proto = (inbound.protocol || '').toLowerCase();
  const enc = encodeURIComponent;

  if (proto === 'trojan') {
    return `trojan://${enc(uuid)}@${host}:${port}#${enc(clientEmail || host)}`;
  }

  const streamSettings = parseInboundJsonField(inbound.streamSettings);
  const settings = parseInboundJsonField(inbound.settings);
  const network = streamSettings.network || 'tcp';
  const security = streamSettings.security || 'none';
  const tcpSettings = streamSettings.tcpSettings || {};
  const wsSettings = streamSettings.wsSettings || {};
  const header = tcpSettings.header || wsSettings.header || {};
  const headerType = (header.type || 'none').toLowerCase();
  const request = header.request || {};
  const reqPath = request.path;
  const pathVal = Array.isArray(reqPath) ? (reqPath[0] || '/') : (reqPath || (wsSettings.path != null && wsSettings.path !== '') ? wsSettings.path : '/');
  const path = pathVal || '/';
  const reqHeaders = request.headers || {};
  const hostHeader = reqHeaders.Host || reqHeaders.host;
  const hostFromHeader = Array.isArray(hostHeader) ? (hostHeader[0] || '') : (hostHeader || '');
  const wsHost = wsSettings.host || '';
  const sni = (streamSettings.realitySettings && streamSettings.realitySettings.serverNames) ? (streamSettings.realitySettings.serverNames[0] || '') : (streamSettings.tlsSettings && streamSettings.tlsSettings.serverName) || '';
  const hostParam = hostFromHeader || wsHost || sni || '';

  if (proto === 'vless') {
    const encryption = settings.encryption != null ? settings.encryption : (settings.decryption !== undefined ? 'none' : 'none');
    const params = new URLSearchParams();
    params.set('type', network);
    params.set('encryption', encryption);
    params.set('security', security);
    if (path) params.set('path', path);
    if (hostParam) params.set('host', hostParam);
    if (headerType && headerType !== 'none') params.set('headerType', headerType);
    const hash = clientEmail ? enc(clientEmail) : enc(host);
    return `vless://${uuid}@${host}:${port}?${params.toString()}#${hash}`;
  }

  if (proto === 'vmess') {
    const cfg = {
      v: '2',
      ps: clientEmail || host,
      add: host,
      port: String(port),
      id: uuid,
      aid: '0',
      net: network,
      type: headerType === 'none' ? 'none' : headerType,
      host: hostParam,
      path: path || '',
      tls: security
    };
    const json = JSON.stringify(cfg);
    const base64 = Buffer.from(json, 'utf8').toString('base64');
    return `vmess://${base64}`;
  }
  return null;
}

/**
 * افزودن کلاینت به اینباند پنل 3x-ui (با کوکی لاگین).
 * @param {Object} server - رکورد سرور از دیتابیس
 * @param {string|number} inboundId - شناسه اینباند در پنل
 * @param {string} clientEmail - ایمیل/شناسه کلاینت (مثلاً tg_12345)
 * @param {Object} [options] - اختیاری: totalGB (حجم به گیگ)، expiryTime (زمان انقضا میلی‌ثانیه - مطابق API پنل)
 * @returns {{ success: true, clientEmail: string, uuid?: string } | { success: false, error: string }}
 */
export async function addClientToInbound(server, inboundId, clientEmail, options = {}) {
  const crypto = await import('crypto');
  const uuid = crypto.randomUUID && crypto.randomUUID() || crypto.randomBytes(16).toString('hex');
  let inbounds;
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    inbounds = result.inbounds;
    cookie = result.cookie;
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[Server] addClientToInbound login error:', msg);
    return { success: false, error: msg };
  }
  const inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(inboundId));
  if (!inbound) {
    console.error('[Server] addClientToInbound inbound not found:', inboundId);
    return { success: false, error: 'Inbound not found' };
  }
  const protocol = (inbound.protocol || '').toLowerCase();
  // پنل 3x-ui totalGB را به صورت بایت انتظار دارد (مثلاً 15 گیگ = 15 * 1024^3 بایت)
  const totalGBBytes = options.totalGB != null
    ? Math.floor(Number(options.totalGB) * 1024 * 1024 * 1024)
    : 0;
  const clientOptions = {
    email: clientEmail,
    flow: '',
    limitIp: 0,
    totalGB: totalGBBytes,
    expiryTime: options.expiryTime != null ? Number(options.expiryTime) : 0,
    enable: true,
    tgId: '',
    subId: '',
    comment: '',
    reset: 0
  };
  if (protocol === 'trojan') {
    clientOptions.password = uuid;
  } else {
    clientOptions.id = uuid;
  }
  const body = {
    id: Number(inboundId) || inboundId,
    settings: JSON.stringify({ clients: [clientOptions] })
  };
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const addClientPath = basePath ? `${basePath}/panel/api/inbounds/addClient` : '/panel/api/inbounds/addClient';
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const postBody = JSON.stringify(body);
  const doRequest = (mod, opts, data) =>
    new Promise((resolve, reject) => {
      const req = mod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.setTimeout(15000);
      req.write(data);
      req.end();
    });
  const opts = {
    hostname,
    port,
    path: addClientPath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookie,
      'Content-Length': Buffer.byteLength(postBody)
    },
    timeout: 15000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await doRequest(httpMod, opts, postBody);
    const resBody = (res.body || '').trim();
    if (res.statusCode === 401 || res.statusCode === 403) {
      return { success: false, error: 'Session expired or unauthorized' };
    }
    let data;
    try {
      data = resBody ? JSON.parse(resBody) : {};
    } catch (_) {
      return { success: false, error: 'Invalid response from panel' };
    }
    if (!data || data.success !== true) {
      return { success: false, error: (data && data.msg) || 'Add client failed' };
    }
    console.log(`[Server] addClientToInbound OK: ${server.serverName} inbound ${inboundId} client ${clientEmail}`);
    return { success: true, clientEmail, uuid };
  } catch (e) {
    const msg = e.message || String(e);
    console.error('[Server] addClientToInbound POST error:', msg);
    return { success: false, error: msg };
  }
}

/**
 * دریافت آمار ترافیک و وضعیت کلاینت از پنل با ایمیل (GET getClientTraffics/{email})
 * @returns {{ success: true, obj } | { success: false, error: string }}
 */
export async function getClientTrafficsByEmail(server, email) {
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    cookie = result.cookie;
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const path = basePath
    ? `${basePath}/panel/api/inbounds/getClientTraffics/${encodeURIComponent(email)}`
    : `/panel/api/inbounds/getClientTraffics/${encodeURIComponent(email)}`;
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const opts = {
    hostname,
    port,
    path,
    method: 'GET',
    headers: { Accept: 'application/json', Cookie: cookie },
    timeout: 10000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = httpMod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(10000);
      req.end();
    });
    const data = res.body ? JSON.parse(res.body.trim()) : {};
    if (res.statusCode === 401 || res.statusCode === 403) return { success: false, error: 'Unauthorized' };
    if (!data.success || !data.obj) return { success: false, error: data.msg || 'Client not found' };
    return { success: true, obj: data.obj };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * پیدا کردن کلاینت در اینباند از روی لیست اینباندها (از settings.clients)
 */
export async function getClientFromInbound(server, inboundId, clientEmail) {
  let inbounds;
  try {
    inbounds = await getServerInbounds(server);
  } catch (e) {
    return null;
  }
  const inbound = Array.isArray(inbounds) && inbounds.find((ib) => String(ib.id) === String(inboundId));
  if (!inbound) return null;
  const settings = parseInboundJsonField(inbound.settings);
  const clients = settings.clients;
  if (!Array.isArray(clients)) return null;
  const client = clients.find((c) => (c && c.email) && String(c.email).trim() === String(clientEmail).trim());
  return client || null;
}

/**
 * به‌روزرسانی کلاینت در پنل (POST updateClient/{uuid})
 * clientPayload باید شیء کامل کلاینت باشد (مثلاً از getClientFromInbound + تغییرات)
 */
export async function updateClientInbound(server, inboundId, clientUuid, clientPayload) {
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    cookie = result.cookie;
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const updatePath = basePath
    ? `${basePath}/panel/api/inbounds/updateClient/${encodeURIComponent(clientUuid)}`
    : `/panel/api/inbounds/updateClient/${encodeURIComponent(clientUuid)}`;
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const body = {
    id: Number(inboundId) || inboundId,
    settings: JSON.stringify({ clients: [clientPayload] })
  };
  const postBody = JSON.stringify(body);
  const opts = {
    hostname,
    port,
    path: updatePath,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: cookie,
      'Content-Length': Buffer.byteLength(postBody)
    },
    timeout: 15000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = httpMod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(15000);
      req.write(postBody);
      req.end();
    });
    const data = res.body ? JSON.parse(res.body.trim()) : {};
    if (res.statusCode === 401 || res.statusCode === 403) return { success: false, error: 'Unauthorized' };
    if (!data.success) return { success: false, error: data.msg || 'Update failed' };
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * حذف کلاینت از اینباند با ایمیل (POST delClientByEmail)
 */
export async function delClientByEmail(server, inboundId, email) {
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    cookie = result.cookie;
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const path = basePath
    ? `${basePath}/panel/api/inbounds/${encodeURIComponent(inboundId)}/delClientByEmail/${encodeURIComponent(email)}`
    : `/panel/api/inbounds/${encodeURIComponent(inboundId)}/delClientByEmail/${encodeURIComponent(email)}`;
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const opts = {
    hostname,
    port,
    path,
    method: 'POST',
    headers: { Accept: 'application/json', Cookie: cookie },
    timeout: 15000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = httpMod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(15000);
      req.end();
    });
    const data = res.body ? JSON.parse((res.body || '').trim()) : {};
    if (res.statusCode === 401 || res.statusCode === 403) return { success: false, error: 'Unauthorized' };
    return { success: !!data.success, error: data.success ? null : (data.msg || 'Delete failed') };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * دریافت فایل دیتابیس پنل (GET /panel/api/server/getDb) به‌صورت باینری
 * @returns {{ success: true, buffer: Buffer } | { success: false, error: string }}
 */
export async function getPanelDbFile(server) {
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    cookie = result.cookie;
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const path = basePath ? `${basePath}/panel/api/server/getDb` : '/panel/api/server/getDb';
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const opts = {
    hostname,
    port,
    path,
    method: 'GET',
    headers: { Accept: 'application/octet-stream,*/*', Cookie: cookie },
    timeout: 60000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = httpMod.request(opts, (res) => {
        const chunks = [];
        res.on('data', (ch) => chunks.push(ch));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode || 0,
            buffer: Buffer.concat(chunks),
            contentType: res.headers['content-type'] || ''
          })
        );
      });
      req.on('error', reject);
      req.setTimeout(60000);
      req.end();
    });
    if (res.statusCode === 401 || res.statusCode === 403) return { success: false, error: 'Unauthorized' };
    if (res.statusCode < 200 || res.statusCode >= 300) return { success: false, error: `HTTP ${res.statusCode}` };
    if (!res.buffer || res.buffer.length === 0) return { success: false, error: 'Empty response' };
    return { success: true, buffer: res.buffer };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

/**
 * فراخوانی بکاپ به تلگرام (GET backuptotgbot) — برای سازگاری نگه داشته شده
 */
export async function triggerBackupToTgbot(server) {
  let cookie;
  try {
    const result = await xuiLoginAndGetInbounds(server);
    cookie = result.cookie;
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
  const baseURL = buildServerURL(server);
  const u = new URL(baseURL);
  let hostname = u.hostname;
  let port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  let basePath = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  const path = basePath ? `${basePath}/panel/api/backuptotgbot` : '/panel/api/backuptotgbot';
  const useHttps = u.protocol === 'https:';
  const httpMod = useHttps ? await import('https') : await import('http');
  const opts = {
    hostname,
    port,
    path,
    method: 'GET',
    headers: { Accept: 'application/json', Cookie: cookie },
    timeout: 15000
  };
  if (useHttps) opts.rejectUnauthorized = false;
  try {
    const res = await new Promise((resolve, reject) => {
      const req = httpMod.request(opts, (res) => {
        let data = '';
        res.on('data', (ch) => { data += ch; });
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      });
      req.on('error', reject);
      req.setTimeout(15000);
      req.end();
    });
    if (res.statusCode === 401 || res.statusCode === 403) return { success: false, error: 'Unauthorized' };
    return { success: res.statusCode >= 200 && res.statusCode < 300 };
  } catch (e) {
    return { success: false, error: e.message || String(e) };
  }
}

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

/**
 * حذف کلاینت‌های غیرفعال: انقضا بیش از ۵ روز گذشته.
 */
export async function runCleanInactiveClients(server) {
  const result = { deleted: 0, errors: [] };
  let inbounds;
  try {
    inbounds = await getServerInbounds(server);
  } catch (e) {
    result.errors.push(`${server.serverName}: ${e.message || e}`);
    return result;
  }
  const now = Date.now();
  const cutoff = now - FIVE_DAYS_MS;
  for (const inbound of inbounds || []) {
    const settings = parseInboundJsonField(inbound.settings);
    const clients = settings.clients;
    if (!Array.isArray(clients)) continue;
    const inboundId = inbound.id;
    for (const client of clients) {
      const email = client && client.email ? String(client.email).trim() : '';
      if (!email) continue;
      const expiryTime = client.expiryTime != null ? Number(client.expiryTime) : 0;
      if (expiryTime <= 0) continue;
      if (expiryTime >= cutoff) continue;
      const del = await delClientByEmail(server, inboundId, email);
      if (del.success) result.deleted += 1;
      else result.errors.push(`${server.serverName}/${email}: ${del.error}`);
    }
  }
  return result;
}
