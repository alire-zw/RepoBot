// State management for channel adding process
const channelAddingStates = new Map();

export const setChannelAddingState = (userId, state) => {
  channelAddingStates.set(userId, state);
};

export const getChannelAddingState = (userId) => {
  return channelAddingStates.get(userId);
};

export const clearChannelAddingState = (userId) => {
  channelAddingStates.delete(userId);
};

