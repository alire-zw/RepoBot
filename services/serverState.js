const serverAddingStates = new Map();
const serverEditStates = new Map();

export const setServerAddingState = (userId, state) => {
  serverAddingStates.set(userId, state);
};

export const getServerAddingState = (userId) => {
  return serverAddingStates.get(userId);
};

export const clearServerAddingState = (userId) => {
  serverAddingStates.delete(userId);
};

/** حالت ویرایش یکی از فیلدهای سرور: { serverId, field, chatId, requestMessageId } */
export const setServerEditState = (userId, state) => {
  serverEditStates.set(userId, state);
};

export const getServerEditState = (userId) => {
  return serverEditStates.get(userId);
};

export const clearServerEditState = (userId) => {
  serverEditStates.delete(userId);
};
