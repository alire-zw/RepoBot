import { getState, setState, deleteState } from './stateManager.js';

const PREFIX = 'charge_';

const getKey = (userID) => `${PREFIX}${userID}`;

export const getChargeState = (userID) => {
  return getState(getKey(userID));
};

export const setChargeState = (userID, state) => {
  setState(getKey(userID), state);
};

export const clearChargeState = (userID) => {
  deleteState(getKey(userID));
};

