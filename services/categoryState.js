const categoryStates = new Map();

export const setCategoryState = (userId, state) => {
  categoryStates.set(userId, state);
};

export const getCategoryState = (userId) => {
  return categoryStates.get(userId);
};

export const clearCategoryState = (userId) => {
  categoryStates.delete(userId);
};
