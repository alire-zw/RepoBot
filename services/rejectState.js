import { getState, setState, deleteState, getAllStates } from './stateManager.js';

const PREFIX = 'reject_';

const getKey = (adminID) => `${PREFIX}${adminID}`;

export const getRejectState = (adminID) => {
  return getState(getKey(adminID));
};

export const setRejectState = (adminID, state) => {
  setState(getKey(adminID), state);
};

export const clearRejectState = (adminID) => {
  deleteState(getKey(adminID));
};

export const getAllRejectStates = () => {
  const allStates = getAllStates();
  const rejectStates = new Map();
  for (const [key, value] of allStates.entries()) {
    if (String(key).startsWith(PREFIX)) {
      const adminID = String(key).replace(PREFIX, '');
      rejectStates.set(adminID, value);
    }
  }
  return rejectStates;
};

