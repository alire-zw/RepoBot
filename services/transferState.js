import { getState, setState, deleteState } from './stateManager.js';

const PREFIX = 'transfer_';

const getKey = (userID) => `${PREFIX}${userID}`;

export const getTransferState = (userID) => {
  return getState(getKey(userID));
};

export const setTransferState = (userID, state) => {
  setState(getKey(userID), state);
};

export const clearTransferState = (userID) => {
  deleteState(getKey(userID));
};

