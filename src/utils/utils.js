export const allNotEmpty = (...values) => values.every((el) => !!el);
export const updateObject = (prevObj, newValue) => {
    return {
      ...prevObj,
      ...newValue
    };
};