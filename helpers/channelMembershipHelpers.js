import { getActiveChannels, checkUserMembership } from '../services/channelMembershipService.js';

export const getChannelMembershipKeyboard = async (botApi, userID) => {
  try {
    const activeChannels = await getActiveChannels();
    
    const keyboard = [];
    
    if (activeChannels.length === 0) {
      return { inline_keyboard: keyboard };
    }
    
    const channelsToShow = [];
    
    for (const channel of activeChannels) {
      const isMember = await checkUserMembership(botApi, channel.channelID, userID);
      if (!isMember) {
        channelsToShow.push(channel);
      }
    }
    
    for (const channel of channelsToShow) {
      const buttonLabel = channel.buttonLabel || 'تایید عضویت';
      const inviteLink = channel.inviteLink;
      
      if (inviteLink) {
        keyboard.push([
          { text: buttonLabel, url: inviteLink }
        ]);
      }
    }
    
    if (channelsToShow.length > 0) {
      keyboard.push([
        { text: '✅ تایید عضویت', callback_data: 'verify_membership' }
      ]);
    }
    
    return { inline_keyboard: keyboard };
  } catch (error) {
    console.error('Error building channel membership keyboard:', error);
    throw error;
  }
};

export const getChannelMembershipMessage = () => {
  return `📢 <b>عضویت در کانال</b>

💳 برای استفاده از ربات و <b>تهیه اشتراک</b>، لطفاً در <b>کانال‌های زیر</b> عضو شوید.

🔗 پس از عضویت در <b>تمام کانال‌ها</b>، روی دکمه <b>"✅ تایید عضویت"</b> کلیک کنید:`;
};

