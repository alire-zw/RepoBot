const serverAddingStates = new Map();

export const setServerAddingState = (userId, state) => {
  serverAddingStates.set(userId, state);
};

export const getServerAddingState = (userId) => {
  return serverAddingStates.get(userId);
};

export const clearServerAddingState = (userId) => {
  serverAddingStates.delete(userId);
};
