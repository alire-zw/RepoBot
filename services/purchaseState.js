import { getState, setState, deleteState } from './stateManager.js';

const PREFIX = 'purchase_';

const getKey = (userID) => `${PREFIX}${userID}`;

export const getPurchaseState = (userID) => {
  return getState(getKey(userID));
};

export const setPurchaseState = (userID, state) => {
  setState(getKey(userID), state);
};

export const clearPurchaseState = (userID) => {
  deleteState(getKey(userID));
};
