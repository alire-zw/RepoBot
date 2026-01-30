import config from '../config/env.js';

export const isAdmin = (userId) => {
  if (!userId) return false;
  return config.ADMINS.includes(String(userId));
};

