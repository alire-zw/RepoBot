import { getPool } from './database.js';

export const getActiveChannels = async () => {
  try {
    const pool = getPool();
    const [result] = await pool.query(
      'SELECT * FROM `channels` WHERE `isLocked` = 1 ORDER BY `createdAt` ASC'
    );
    return result;
  } catch (error) {
    console.error('Error getting active channels:', error);
    throw error;
  }
};

export const checkUserMembership = async (botApi, channelID, userID) => {
  try {
    const member = await botApi.getChatMember(channelID, userID);
    const memberStatuses = ['member', 'administrator', 'creator'];
    return memberStatuses.includes(member.status);
  } catch (error) {
    console.error(`Error checking membership for user ${userID} in channel ${channelID}:`, error.message);
    return false;
  }
};

export const checkUserMembershipInAllChannels = async (botApi, userID) => {
  try {
    const activeChannels = await getActiveChannels();
    
    if (activeChannels.length === 0) {
      return {
        allJoined: true,
        missingChannels: [],
        joinedChannels: []
      };
    }
    
    const missingChannels = [];
    const joinedChannels = [];
    
    for (const channel of activeChannels) {
      try {
        const isMember = await checkUserMembership(botApi, channel.channelID, userID);
        if (!isMember) {
          missingChannels.push(channel);
        } else {
          joinedChannels.push(channel);
        }
      } catch (error) {
        console.error(`[checkUserMembershipInAllChannels] Error checking channel ${channel.channelID}:`, error.message);
        missingChannels.push(channel);
      }
    }
    
    return {
      allJoined: missingChannels.length === 0,
      missingChannels,
      joinedChannels
    };
  } catch (error) {
    console.error('Error checking user membership in all channels:', error);
    throw error;
  }
};

