const botSettingsStates = new Map();

export const setBotSettingsState = (userId, state) => {
  botSettingsStates.set(userId, state);
};

export const getBotSettingsState = (userId) => {
  return botSettingsStates.get(userId);
};

export const clearBotSettingsState = (userId) => {
  botSettingsStates.delete(userId);
};
