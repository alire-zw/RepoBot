const states = new Map();

export const getState = (key) => {
  return states.get(key);
};

export const setState = (key, value) => {
  states.set(key, value);
};

export const deleteState = (key) => {
  states.delete(key);
};

export const getAllStates = () => {
  return states;
};

export const clearUserStates = (userID, prefix) => {
  for (const [key] of states.entries()) {
    if (key === userID || (prefix && String(key).startsWith(prefix))) {
      states.delete(key);
    }
  }
};

