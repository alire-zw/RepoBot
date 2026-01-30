const planAddStates = new Map();
const planEditStates = new Map();

export const setPlanAddState = (userId, state) => {
  planAddStates.set(userId, state);
};

export const getPlanAddState = (userId) => {
  return planAddStates.get(userId);
};

export const clearPlanAddState = (userId) => {
  planAddStates.delete(userId);
};

export const setPlanEditState = (userId, state) => {
  planEditStates.set(userId, state);
};

export const getPlanEditState = (userId) => {
  return planEditStates.get(userId);
};

export const clearPlanEditState = (userId) => {
  planEditStates.delete(userId);
};
